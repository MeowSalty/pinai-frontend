<script setup lang="ts">
import { computed } from "vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  type GridComponentOption,
  type TooltipComponentOption,
  type DataZoomComponentOption,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ComposeOption } from "echarts/core";
import type { LineSeriesOption } from "echarts/charts";
import type { TrendDataPoint } from "@/types/stats";
import { formatTokens } from "@/utils/numberUtils";

use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

type ECOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | DataZoomComponentOption
>;

interface Props {
  data: TrendDataPoint[];
  dataKey: "request_count" | "total_tokens";
  granularity: string;
  loading: boolean;
}

const props = defineProps<Props>();

const chartColor = computed(() => (props.dataKey === "request_count" ? "#409EFF" : "#67C23A"));

function formatTimestamp(timestamp: string, granularity: string): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (granularity === "1d") {
    return `${month}-${day}`;
  }

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

const timestamps = computed(() =>
  props.data.map((item) => formatTimestamp(item.timestamp, props.granularity)),
);

const values = computed(() => props.data.map((item) => item[props.dataKey]));

const chartOption = computed<ECOption>(() => ({
  grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "cross" },
    valueFormatter: (value) => {
      if (typeof value !== "number") {
        return String(value ?? "-");
      }
      return props.dataKey === "total_tokens" ? formatTokens(value) : String(value);
    },
  },
  xAxis: {
    type: "category",
    data: timestamps.value,
    boundaryGap: false,
  },
  yAxis: {
    type: "value",
    axisLabel: {
      formatter: (value: number) =>
        props.dataKey === "total_tokens" ? formatTokens(value) : String(value),
    },
  },
  series: [
    {
      type: "line",
      data: values.value,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: chartColor.value },
      itemStyle: { color: chartColor.value },
      areaStyle: { opacity: 0.3, color: chartColor.value },
      emphasis: { focus: "series" },
    },
  ],
}));
</script>

<template>
  <n-empty v-if="data.length === 0" description="暂无趋势数据" />
  <VChart v-else class="trend-chart" :option="chartOption" :loading="loading" autoresize />
</template>

<style scoped>
.trend-chart {
  width: 100%;
  height: 300px;
}
</style>
