import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";
import { useApiServerStore } from "@/stores/apiServerStore";
import { storeToRefs } from "pinia";

/**
 * API 服务器检查工具
 * 提供统一的服务器选择检查和错误提示
 */
export function useApiServerCheck() {
  const router = useRouter();
  const message = useMessage();
  const apiServerStore = useApiServerStore();
  const { activeServer, servers } = storeToRefs(apiServerStore);

  /**
   * 检查是否已选择 API 服务器
   * 如果未选择，会显示相应提示并跳转到服务器配置页面
   * @returns {boolean} 是否已选择服务器
   */
  const checkApiServer = (): boolean => {
    if (activeServer.value) {
      return true;
    }

    // 未选择服务器，根据服务器列表状态显示不同消息
    if (servers.value.length === 0) {
      message.info("请先添加一个 API 服务器");
    } else {
      message.warning("请先选择一个 API 服务器");
    }

    // 跳转到服务器配置页面
    router.push("/server_config");

    return false;
  };

  /**
   * 检查是否已选择 API 服务器（抛出错误版本）
   * 用于需要抛出错误的场景
   * @throws {Error} 如果未选择服务器
   */
  const ensureApiServer = (): void => {
    if (!activeServer.value) {
      // 显示消息并跳转
      if (servers.value.length === 0) {
        message.info("请先添加一个 API 服务器");
      } else {
        message.warning("请先选择一个 API 服务器");
      }
      router.push("/server_config");

      throw new Error("未选择 API 服务器");
    }
  };

  return {
    checkApiServer,
    ensureApiServer,
  };
}
