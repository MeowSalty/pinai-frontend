import type { Platform } from '@/types/provider'
import type { DeepReadonly } from 'vue'
import { providerApi } from '@/services/providerApi'
import {
  useProviderState,
  type FormModel,
  type KeyFetchResult,
  type MergedModel,
} from './useProviderState'
import type { BatchUpdateResult } from '@/stores/batchUpdateStore'

/**
 * Provider 批量更新相关操作
 */
export function useProviderBatchUpdate() {
  const MODEL_BATCH_SIZE = 100

  const {
    store,
    currentProvider,
    showBatchDiffModal,
    currentBatchDiffProvider,
    newFetchedModels,
    currentKeyFetchResults,
    batchDiffResolve,
  } = useProviderState()

  /**
   * 脱敏显示 API 密钥
   */
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return '***'
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  /**
   * 合并多个密钥获取到的模型
   * 同名模型会被合并，保留所有密钥的关联
   */
  const mergeModelsByKey = (
    keyResults: KeyFetchResult[],
    existingModels: Array<{
      id: number
      name: string
      alias: string
      platform_id?: number
      api_keys?: Array<{ id: number }>
    }>,
  ): MergedModel[] => {
    const modelMap = new Map<string, MergedModel>()

    // 收集成功获取到结果的密钥 ID
    const successfulKeyIds = new Set(
      keyResults.filter((r) => r.status === 'success').map((r) => r.keyId),
    )

    // 首先添加现有模型（保留其 ID）
    // 对成功获取的密钥：清除旧关联，后续从 fetch 结果重建
    // 对失败/未参与的密钥：保留原有关联
    existingModels.forEach((model) => {
      const preservedKeyIds = (model.api_keys || [])
        .map((k) => k.id)
        .filter((keyId) => !successfulKeyIds.has(keyId))
      modelMap.set(model.name, {
        name: model.name,
        alias: model.alias || model.name,
        keyIds: preservedKeyIds,
        isNew: false,
        id: model.id,
        platform_id: model.platform_id || 0,
      })
    })

    // 从成功的 fetch 结果重建密钥关联
    keyResults.forEach((result) => {
      if (result.status === 'success') {
        result.models.forEach((model) => {
          if (modelMap.has(model.name)) {
            // 同名模型，添加密钥关联
            const existing = modelMap.get(model.name)!
            if (!existing.keyIds.includes(result.keyId)) {
              existing.keyIds.push(result.keyId)
            }
          } else {
            // 新模型
            modelMap.set(model.name, {
              name: model.name,
              alias: model.alias || model.name,
              keyIds: [result.keyId],
              isNew: true,
              platform_id: model.platform_id,
            })
          }
        })
      }
    })

    return Array.from(modelMap.values())
  }

  const waitForInterval = async (intervalMs: number) => {
    if (intervalMs <= 0) return
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
    if (chunkSize <= 0) return [items]
    const chunks: T[][] = []
    for (let index = 0; index < items.length; index += chunkSize) {
      chunks.push(items.slice(index, index + chunkSize))
    }
    return chunks
  }

  /**
   * 计算模型变更差异
   */
  const calculateModelDiff = (
    existingModels: Array<{
      id: number
      name: string
      alias: string
      api_keys?: Array<{ id: number }>
    }>,
    mergedNewModels: MergedModel[],
  ): {
    added: MergedModel[]
    removed: Array<{
      id: number
      name: string
      alias: string
      api_keys?: Array<{ id: number }>
    }>
    updated: MergedModel[]
  } => {
    const existingMap = new Map(existingModels.map((m) => [m.name, m]))
    const newMap = new Map(mergedNewModels.map((m) => [m.name, m]))

    // 新增：新模型中有但现有模型中没有的
    const added = mergedNewModels.filter((m) => !existingMap.has(m.name))

    // 移除：现有模型中有但新模型中没有的，或者密钥列表为空的
    const removed = existingModels.filter((m) => {
      const newModel = newMap.get(m.name)
      return !newModel || newModel.keyIds.length === 0
    })

    // 更新：模型存在但密钥关联发生变化的
    const updated = mergedNewModels.filter((m) => {
      if (!existingMap.has(m.name) || m.keyIds.length === 0) return false
      const existing = existingMap.get(m.name)!
      const existingKeyIds = new Set(existing.api_keys?.map((k) => k.id) || [])
      const newKeyIds = new Set(m.keyIds)

      // 检查密钥关联是否有变化
      if (existingKeyIds.size !== newKeyIds.size) return true
      for (const keyId of newKeyIds) {
        if (!existingKeyIds.has(keyId)) return true
      }
      return false
    })

    return { added, removed, updated }
  }

  // 处理单个供应商的模型更新
  const processSingleProviderUpdate = async (
    provider: DeepReadonly<Platform>,
    options: { autoRename: boolean; autoConfirm: boolean; keyFetchIntervalMs?: number },
    results: BatchUpdateResult[],
  ) => {
    // 获取当前供应商的结果对象
    const currentResult = results.find((r) => r.provider.id === provider.id)

    // 1. 加载供应商信息
    await store.loadProviderForEdit(provider.id)

    // 2. 加载 API 密钥
    try {
      await store.loadProviderApiKey(provider.id)
    } catch (error) {
      console.warn('加载供应商密钥失败：', error)
    }

    // 3. 获取现有模型列表
    await store.loadModelsByProviderId(provider.id)

    const apiKeys = currentProvider.value?.apiKeys || []

    // 4. 多密钥并行获取模型列表
    let keyResults: KeyFetchResult[] = []

    if (apiKeys.length === 0) {
      // 没有密钥的情况（例如 Ollama），使用原有逻辑
      const fetchedModels = await store.fetchModelsFromProviderOnly()
      keyResults = [
        {
          keyId: 0, // 虚拟密钥 ID
          keyValue: '无需密钥',
          models: fetchedModels as FormModel[],
          status: 'success',
        },
      ]
    } else {
      const intervalMs = options.keyFetchIntervalMs ?? 5000

      // 先一次性初始化所有密钥状态，确保进度条总数从一开始就是完整数量
      if (currentResult) {
        currentResult.keyResults = apiKeys
          .filter((key) => Boolean(key))
          .map((key) => ({
            keyId: key.id || 0,
            keyValue: maskApiKey(key.value),
            status: 'pending' as const,
            modelCount: 0,
          }))
      }

      for (let index = 0; index < apiKeys.length; index += 1) {
        const key = apiKeys[index]
        if (!key) continue

        try {
          const models = await store.fetchModelsFromProviderByKey(key.value, {
            id: key.id || 0,
            tempId: key.tempId,
          })

          // 更新密钥状态为成功
          if (currentResult) {
            const keyResultIndex = currentResult.keyResults.findIndex(
              (kr) => kr.keyId === (key.id || 0),
            )
            if (keyResultIndex !== -1) {
              currentResult.keyResults[keyResultIndex] = {
                keyId: key.id || 0,
                keyValue: maskApiKey(key.value),
                status: 'success' as const,
                modelCount: models.length,
              }
            }
          }

          keyResults.push({
            keyId: key.id || 0,
            keyValue: key.value,
            models: models as FormModel[],
            status: 'success' as const,
          })
        } catch (error) {
          console.warn(`密钥 ${maskApiKey(key.value)} 获取模型失败：`, error)

          // 更新密钥状态为失败
          if (currentResult) {
            const keyResultIndex = currentResult.keyResults.findIndex(
              (kr) => kr.keyId === (key.id || 0),
            )
            if (keyResultIndex !== -1) {
              currentResult.keyResults[keyResultIndex] = {
                keyId: key.id || 0,
                keyValue: maskApiKey(key.value),
                status: 'error' as const,
                error: error instanceof Error ? error.message : String(error),
                modelCount: 0,
              }
            }
          }

          keyResults.push({
            keyId: key.id || 0,
            keyValue: key.value,
            models: [],
            status: 'error' as const,
            error: error instanceof Error ? error.message : String(error),
          })
        }

        if (index < apiKeys.length - 1) {
          await waitForInterval(intervalMs)
        }
      }

      // 检查是否所有密钥都失败了
      const allFailed = keyResults.every((r) => r.status === 'error')
      if (allFailed) {
        throw new Error('所有密钥获取模型均失败，请检查密钥是否有效')
      }
    }

    // 存储密钥结果到 BatchUpdateResult（如果还没有存储）
    if (currentResult && currentResult.keyResults.length === 0) {
      currentResult.keyResults = keyResults.map((kr) => ({
        keyId: kr.keyId,
        keyValue: maskApiKey(kr.keyValue),
        status: kr.status,
        error: kr.error,
        modelCount: kr.models.length,
      }))
    }

    // 计算每个密钥的新增/移除数量
    if (currentResult) {
      const models = currentProvider.value?.models || []
      const modelNames = new Set(models.map((m) => m.name))

      for (const kr of keyResults) {
        if (kr.status !== 'success') continue

        const fetchedNames = new Set(kr.models.map((m) => m.name))

        // 该密钥获取到但 provider 中不存在的模型
        const addedCount = kr.models.filter((m) => !modelNames.has(m.name)).length

        // provider 中关联了该密钥、但该密钥不再返回的模型
        // keyId === 0 为无密钥场景（如 Ollama），视为所有现有模型都与之关联
        const removedCount = models.filter((m) => {
          const isAssociated =
            kr.keyId === 0 || (m.api_keys?.some((k) => k.id === kr.keyId) ?? false)
          return isAssociated && !fetchedNames.has(m.name)
        }).length

        const entry = currentResult.keyResults.find((e) => e.keyId === kr.keyId)
        if (entry) {
          entry.addedCount = addedCount
          entry.removedCount = removedCount
        }
      }
    }

    // 5. 合并同名模型
    const existingModels = currentProvider.value?.models || []
    const mergedModels = mergeModelsByKey(keyResults, existingModels)

    // 6. 如果启用自动重命名，应用重命名规则
    let modelsToProcess = mergedModels
    if (options.autoRename) {
      const { applyRulesToName } = await import('@/utils/rename')
      const { useRenameRulesStore } = await import('@/stores/renameRulesStore')
      const renameStore = useRenameRulesStore()
      await renameStore.loadRules()

      modelsToProcess = modelsToProcess.map((model) => {
        const newAlias = applyRulesToName(model.name, renameStore.rules)
        return {
          ...model,
          alias: newAlias !== model.name ? newAlias : model.alias,
        }
      })
    }

    // 7. 判断是否需要显示 diff 界面
    const hasExistingModels =
      currentProvider.value &&
      currentProvider.value.models.length > 0 &&
      currentProvider.value.models.some((m) => m.id > 0)

    if (!options.autoConfirm && hasExistingModels) {
      // 计算差异
      const { added, removed, updated } = calculateModelDiff(existingModels, modelsToProcess)

      const hasChanges = added.length > 0 || removed.length > 0 || updated.length > 0

      if (hasChanges) {
        // 有变更，弹出 diff 界面
        currentBatchDiffProvider.value = provider
        // 存储按密钥分组的结果，供 UI 展示
        currentKeyFetchResults.value = keyResults
        // 将 MergedModel 转换为 FormModel 用于现有的 diff 界面
        newFetchedModels.value = modelsToProcess
          .filter((m) => m.keyIds.length > 0) // 只包含有密钥关联的模型
          .map((m) => ({
            id: m.id || -1,
            platform_id: m.platform_id,
            name: m.name,
            alias: m.alias,
            isDirty: m.isNew,
            api_keys: m.keyIds.map((keyId) => ({
              id: keyId,
              platform_id: m.platform_id,
              value: '',
            })),
          }))
        showBatchDiffModal.value = true

        // 等待用户确认
        const result = await new Promise<{
          confirmed: boolean
          selectedModels?: FormModel[]
          removedModels?: FormModel[]
        }>((resolve) => {
          batchDiffResolve.value = resolve
        })

        if (!result.confirmed) {
          throw new Error('用户取消模型变更确认')
        }

        // 用户已确认，使用确认后的模型列表
        if (result.selectedModels && result.removedModels) {
          // 应用模型变更（包括密钥关联）
          const { addedCount, removedCount } = await applyMergedModelChanges(
            provider.id,
            result.selectedModels,
            result.removedModels,
          )

          const result_item = results.find((r) => r.provider.id === provider.id)
          if (result_item) {
            result_item.addedCount = addedCount
            result_item.removedCount = removedCount
          }

          return // 已处理完成，直接返回
        }
      } else {
        // 无变更，直接标记为成功
        const result_item = results.find((r) => r.provider.id === provider.id)
        if (result_item) {
          result_item.addedCount = 0
          result_item.removedCount = 0
        }
        return // 无变更，直接返回
      }
    }

    // 8. 自动应用变更
    if (currentProvider.value) {
      const { added, removed, updated } = calculateModelDiff(existingModels, modelsToProcess)

      // 转换为 FormModel 格式并应用变更
      const addedFormModels = added
        .filter((m) => m.keyIds.length > 0)
        .map((m) => ({
          id: -1,
          platform_id: provider.id,
          name: m.name,
          alias: m.alias,
          isDirty: true,
          api_keys: m.keyIds.map((keyId) => ({
            id: keyId,
            platform_id: provider.id,
            value: '',
          })),
        }))

      // 密钥关联发生变化的现有模型，也需要更新
      const updatedFormModels = updated
        .filter((m) => m.id && m.id > 0)
        .map((m) => ({
          id: m.id!,
          platform_id: provider.id,
          name: m.name,
          alias: m.alias,
          isDirty: true,
          api_keys: m.keyIds.map((keyId) => ({
            id: keyId,
            platform_id: provider.id,
            value: '',
          })),
        }))

      const removedFormModels = removed.map((m) => ({
        id: m.id,
        platform_id: provider.id,
        name: m.name,
        alias: m.alias,
        isDirty: false,
        api_keys: m.api_keys?.map((k) => ({
          id: k.id,
          platform_id: provider.id,
          value: '',
        })),
      }))

      // 执行变更（新增 + 密钥关联更新的模型一起传入 selectedModels）
      const { addedCount, removedCount } = await applyMergedModelChanges(
        provider.id,
        [...addedFormModels, ...updatedFormModels],
        removedFormModels,
      )

      // 更新结果
      const result = results.find((r) => r.provider.id === provider.id)
      if (result) {
        result.addedCount = addedCount
        result.removedCount = removedCount
      }
    }
  }

  /**
   * 应用合并后的模型变更（包括密钥关联）
   */
  const applyMergedModelChanges = async (
    providerId: number,
    selectedModels: FormModel[],
    removedModels: FormModel[],
  ): Promise<{ addedCount: number; removedCount: number; updatedCount: number }> => {
    let addedCount = 0
    let removedCount = 0
    let updatedCount = 0

    // 1. 删除被移除的模型（分块，避免单次 payload 过大）
    // 通过 type guard 收窄，确保后续传给 deleteModel/deleteModelsBatch 的都是 number
    const modelIdsToDelete = removedModels
      .map((model) => model.id)
      .filter((id): id is number => typeof id === 'number' && id > 0)

    if (modelIdsToDelete.length > 0) {
      const deleteChunks = chunkArray(modelIdsToDelete, MODEL_BATCH_SIZE)

      for (const deleteChunk of deleteChunks) {
        try {
          if (deleteChunk.length === 1) {
            const [modelId] = deleteChunk
            if (modelId !== undefined) {
              // 单个模型删除
              await providerApi.deleteModel(modelId)
              removedCount += 1
            }
          } else if (deleteChunk.length > 1) {
            // 批量删除
            const result = await providerApi.deleteModelsBatch(providerId, deleteChunk)
            removedCount += result.deleted_count
          }
        } catch (error) {
          console.warn(`删除模型失败:`, error)
        }
      }
    }

    // 2. 处理新增和更新的模型（优先批量接口 + 分块）
    const modelsToCreate = selectedModels
      .filter((model) => model.id === -1)
      .map((model) => ({
        name: model.name,
        alias: model.alias,
        api_keys: model.api_keys?.map((k) => ({ id: k.id })) || [],
      }))

    const modelsToUpdate = selectedModels
      .filter((model) => model.id > 0)
      .map((model) => ({
        id: model.id,
        name: model.name,
        alias: model.alias,
        api_keys: model.api_keys || [],
      }))

    if (modelsToCreate.length > 0) {
      const createChunks = chunkArray(modelsToCreate, MODEL_BATCH_SIZE)
      for (const createChunk of createChunks) {
        try {
          if (createChunk.length === 1) {
            const [singleModel] = createChunk
            if (singleModel) {
              await providerApi.createModel(providerId, singleModel)
              addedCount += 1
            }
          } else {
            const result = await providerApi.createModelsBatch(providerId, createChunk)
            addedCount += result.created_count
          }
        } catch (error) {
          console.warn(`批量创建模型失败:`, error)
        }
      }
    }

    if (modelsToUpdate.length > 0) {
      const updateChunks = chunkArray(modelsToUpdate, MODEL_BATCH_SIZE)
      for (const updateChunk of updateChunks) {
        try {
          if (updateChunk.length === 1) {
            const [singleModel] = updateChunk
            if (singleModel) {
              await providerApi.updateModel(singleModel.id, {
                name: singleModel.name,
                alias: singleModel.alias,
                api_keys: singleModel.api_keys,
              })
              updatedCount += 1
            }
          } else {
            const result = await providerApi.updateModelsBatch(
              providerId,
              updateChunk.map((model) => ({
                id: model.id,
                name: model.name,
                alias: model.alias,
                api_keys: model.api_keys.map((k) => ({ id: k.id })),
              })),
            )
            updatedCount += result.updated_count
          }
        } catch (error) {
          console.warn(`批量更新模型失败:`, error)
        }
      }
    }

    // 3. 刷新模型列表
    await store.loadModelsByProviderId(providerId)

    return { addedCount, removedCount, updatedCount }
  }

  // 批量更新中的 diff 确认
  const handleBatchDiffConfirm = async (
    selectedModels: FormModel[],
    removedModels: FormModel[],
  ) => {
    if (batchDiffResolve.value) {
      batchDiffResolve.value({ confirmed: true, selectedModels, removedModels })
      batchDiffResolve.value = null
    }
    showBatchDiffModal.value = false
    currentBatchDiffProvider.value = null
  }

  // 批量更新中的 diff 取消
  const handleBatchDiffCancel = () => {
    if (batchDiffResolve.value) {
      batchDiffResolve.value({ confirmed: false })
      batchDiffResolve.value = null
    }
    showBatchDiffModal.value = false
    currentBatchDiffProvider.value = null
  }

  return {
    handleBatchDiffConfirm,
    handleBatchDiffCancel,
    processSingleProviderUpdate,
  }
}
