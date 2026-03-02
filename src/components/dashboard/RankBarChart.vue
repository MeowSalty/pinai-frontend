<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type LegendComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption } from "echarts/charts";
import type {
  ModelCallRankItem,
  PlatformCallRankItem,
  ModelUsageRankItem,
  PlatformUsageRankItem,
} from "@/types/stats";
import { formatTokens } from "@/utils/numberUtils";
import { getFailureColor } from "@/utils/colorUtils";

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

type ECOption = ComposeOption<
  BarSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption
>;

type RankData =
  | ModelCallRankItem[]
  | PlatformCallRankItem[]
  | ModelUsageRankItem[]
  | PlatformUsageRankItem[];

interface Props {
  data: RankData;
  entity: "model" | "platform";
  metric: "call" | "usage";
}

interface CallChartItem {
  name: string;
  requestCount: number;
  successRate: number;
  failureRate: number;
  failureCount: number;
  percentage: number;
}

interface UsageChartItem {
  name: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  percentage: number;
}

const props = defineProps<Props>();

function getName(item: { model_name?: string; platform_name?: string }): string {
  if (props.entity === "model") {
    return item.model_name ?? "-";
  }
  return item.platform_name ?? "-";
}

function truncateLabel(label: string): string {
  if (label.length <= 12) {
    return label;
  }
  return `${label.slice(0, 12)}...`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

const chartHeight = computed(() => Math.min(500, Math.max(200, props.data.length * 40)));

const callData = computed<CallChartItem[]>(() => {
  if (props.metric !== "call") {
    return [];
  }

  return (props.data as (ModelCallRankItem | PlatformCallRankItem)[]).map((item) => {
    const successRate = item.success_rate ?? 0;
    const failureRate = Math.max(0, 1 - successRate);
    const requestCount = item.request_count ?? 0;

    return {
      name: getName(item),
      requestCount,
      successRate,
      failureRate,
      failureCount: requestCount * failureRate,
      percentage: item.percentage ?? 0,
    };
  });
});

const usageData = computed<UsageChartItem[]>(() => {
  if (props.metric !== "usage") {
    return [];
  }

  return (props.data as (ModelUsageRankItem | PlatformUsageRankItem)[]).map((item) => ({
    name: getName(item),
    promptTokens: item.prompt_tokens ?? 0,
    completionTokens: item.completion_tokens ?? 0,
    totalTokens: item.total_tokens ?? 0,
    percentage: item.percentage ?? 0,
  }));
});

const chartOption = computed<ECOption>(() => {
  if (props.metric === "call") {
    return {
      grid: {
        left: 140,
        right: 20,
        top: 42,
        bottom: 16,
        containLabel: true,
      },
      legend: {
        top: 8,
        left: 0,
        data: ["总请求", "失败请求"],
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const values = Array.isArray(params) ? params : [params];
          const first = values[0] as { dataIndex?: number } | undefined;
          const index = first?.dataIndex ?? 0;
          const row = callData.value[index];
          if (!row) {
            return "-";
          }

          return [
            `<div>${row.name}</div>`,
            `<div>总请求：${row.requestCount}</div>`,
            `<div>失败请求：${row.failureCount.toFixed(2)}</div>`,
            `<div><span style="color:${getFailureColor(row.failureRate)}">失败率：${formatPercent(row.failureRate)}</span></div>`,
            `<div>占比：${formatPercent(row.percentage)}</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "value",
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: callData.value.map((item) => item.name),
        axisLabel: {
          formatter: (value: string) => truncateLabel(value),
        },
      },
      series: [
        {
          name: "总请求",
          type: "bar",
          data: callData.value.map((item) => item.requestCount),
          itemStyle: { color: "#a0b4c8" },
          barMaxWidth: 24,
          z: 1,
        },
        {
          name: "失败请求",
          type: "bar",
          data: callData.value.map((item) => item.failureCount),
          barGap: "-100%",
          barMaxWidth: 24,
          z: 2,
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              getFailureColor(callData.value[params.dataIndex]?.failureRate ?? 0),
          },
        },
      ],
    };
  }

  return {
    grid: {
      left: 140,
      right: 20,
      top: 42,
      bottom: 16,
      containLabel: true,
    },
    legend: {
      top: 8,
      left: 0,
      data: ["输入 Token", "输出 Token"],
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: unknown) => {
        const values = Array.isArray(params) ? params : [params];
        const first = values[0] as { dataIndex?: number } | undefined;
        const index = first?.dataIndex ?? 0;
        const row = usageData.value[index];
        if (!row) {
          return "-";
        }

        return [
          `<div>${row.name}</div>`,
          `<div>输入 Token：${formatTokens(row.promptTokens)}</div>`,
          `<div>输出 Token：${formatTokens(row.completionTokens)}</div>`,
          `<div>总 Token：${formatTokens(row.totalTokens)}</div>`,
          `<div>占比：${formatPercent(row.percentage)}</div>`,
        ].join("");
      },
    },
    xAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => formatTokens(value),
      },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: usageData.value.map((item) => item.name),
      axisLabel: {
        formatter: (value: string) => truncateLabel(value),
      },
    },
    series: [
      {
        name: "输入 Token",
        type: "bar",
        stack: "total",
        barMaxWidth: 24,
        data: usageData.value.map((item) => item.promptTokens),
        itemStyle: { color: "#409EFF" },
      },
      {
        name: "输出 Token",
        type: "bar",
        stack: "total",
        barMaxWidth: 24,
        data: usageData.value.map((item) => item.completionTokens),
        itemStyle: { color: "#67C23A" },
      },
    ],
  };
});
</script>

<template>
  <n-empty v-if="data.length === 0" description="暂无排行数据" />
  <VChart
    v-else
    :key="`${entity}-${metric}`"
    class="rank-bar-chart"
    :style="{ height: `${chartHeight}px` }"
    :option="chartOption"
    :update-options="{ notMerge: true }"
    autoresize
  />
</template>

<style scoped>
.rank-bar-chart {
  width: 100%;
}
</style>
