// 版本信息接口
export interface VersionInfo {
  version: string;
  latest: boolean;
  releaseNotes?: string;
  releaseDate?: string;
}

// 从 GitHub API 获取最新版本信息
export async function checkLatestVersion(): Promise<VersionInfo> {
  try {
    // 直接从 GitHub API 获取最新版本信息
    const response = await fetch(
      "https://api.github.com/repos/MeowSalty/pinai-frontend/releases/latest"
    );

    if (!response.ok) {
      throw new Error(`GitHub API 请求失败：${response.status}`);
    }

    const releaseData = await response.json();

    return {
      version: releaseData.tag_name.replace("v", ""), // 去除 v 前缀
      latest: true, // 假设总是返回最新版本
      releaseNotes: releaseData.body,
      releaseDate: releaseData.published_at,
    };
  } catch (error) {
    console.error("版本检查失败：", error);
    // 如果检查失败，返回当前版本信息
    return {
      version: __APP_VERSION__,
      latest: true,
    };
  }
}

// 检查是否有更新可用
export async function checkForUpdates(currentVersion: string): Promise<{
  hasUpdate: boolean;
  latestVersion?: string;
  currentVersion: string;
}> {
  // 如果当前版本是 "latest"，则不检查更新
  if (currentVersion === "latest") {
    return {
      hasUpdate: false,
      currentVersion,
    };
  }

  try {
    const latestVersionInfo = await checkLatestVersion();

    // 比较版本号，如果当前版本不是最新版本，则返回更新信息
    const hasUpdate = latestVersionInfo.version !== currentVersion;

    return {
      hasUpdate,
      latestVersion: latestVersionInfo.version,
      currentVersion,
    };
  } catch (error) {
    console.error("更新检查失败：", error);
    return {
      hasUpdate: false,
      currentVersion,
    };
  }
}

// 创建版本检查状态管理
export class VersionChecker {
  private lastCheckTime: number | null = null;
  private checkInterval = 24 * 60 * 60 * 1000; // 24 小时检查一次

  async check(currentVersion: string): Promise<boolean> {
    // 如果当前版本是 "latest"，则不检查更新
    if (currentVersion === "latest") {
      return false;
    }

    // 如果距离上次检查时间不足 24 小时，则直接返回上次结果
    const now = Date.now();
    if (this.lastCheckTime && now - this.lastCheckTime < this.checkInterval) {
      return false; // 不频繁检查
    }

    this.lastCheckTime = now;

    try {
      const updateInfo = await checkForUpdates(currentVersion);
      return updateInfo.hasUpdate;
    } catch (error) {
      console.error("版本检查器错误：", error);
      return false;
    }
  }
}

export const versionChecker = new VersionChecker();
