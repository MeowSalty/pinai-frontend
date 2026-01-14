<script setup lang="ts">
import { computed } from "vue";

type LegendPosition = "bottom" | "right";

export interface ProgressSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: ProgressSegment[];
  height?: number;
  borderRadius?: number;
  showLegend?: boolean;
  legendPosition?: LegendPosition;
  showTooltip?: boolean;
  railColor?: string;
  total?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 12,
  borderRadius: 6,
  showLegend: true,
  legendPosition: "bottom",
  showTooltip: true,
  railColor: "#e0e0e0",
});

const totalValue = computed(() => {
  if (typeof props.total === "number") {
    return Math.max(0, props.total);
  }
  return props.segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
});

const segmentsWithPercent = computed(() => {
  const total = totalValue.value;
  return props.segments.map((segment) => {
    const safeValue = Math.max(0, segment.value);
    const percent = total > 0 ? (safeValue / total) * 100 : 0;
    return {
      ...segment,
      value: safeValue,
      percent,
    };
  });
});

const visibleSegments = computed(() => {
  return segmentsWithPercent.value.filter((segment) => segment.value > 0 && segment.percent > 0);
});

const legendPositionClass = computed(() => {
  return props.legendPosition === "right" ? "legend-right" : "legend-bottom";
});
</script>

<template>
  <div class="segmented-progress">
    <div
      class="segmented-progress__rail"
      :style="{
        height: `${height}px`,
        borderRadius: `${borderRadius}px`,
        backgroundColor: railColor,
      }"
    >
      <template v-if="showTooltip">
        <n-tooltip v-for="(segment, index) in visibleSegments" :key="segment.key" trigger="hover">
          <template #trigger>
            <div
              class="segmented-progress__segment"
              :class="{
                'is-first': index === 0,
                'is-last': index === visibleSegments.length - 1,
              }"
              :style="{
                width: `${segment.percent}%`,
                backgroundColor: segment.color,
              }"
            />
          </template>
          <div class="segmented-progress__tooltip">
            {{ segment.label }}: {{ segment.value }} ({{ segment.percent.toFixed(1) }}%)
          </div>
        </n-tooltip>
      </template>
      <template v-else>
        <div
          v-for="(segment, index) in visibleSegments"
          :key="segment.key"
          class="segmented-progress__segment"
          :class="{
            'is-first': index === 0,
            'is-last': index === visibleSegments.length - 1,
          }"
          :style="{
            width: `${segment.percent}%`,
            backgroundColor: segment.color,
          }"
        />
      </template>
    </div>

    <div v-if="showLegend" class="segmented-progress__legend" :class="legendPositionClass">
      <div v-for="segment in segmentsWithPercent" :key="segment.key" class="legend-item">
        <span class="legend-color" :style="{ backgroundColor: segment.color }" />
        <span class="legend-label">{{ segment.label }}</span>
        <span class="legend-value">{{ segment.value }}</span>
        <span class="legend-percent" v-if="totalValue > 0">
          ({{ segment.percent.toFixed(1) }}%)
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.segmented-progress {
  width: 100%;
}

.segmented-progress__rail {
  display: flex;
  overflow: hidden;
}

.segmented-progress__segment {
  height: 100%;
  transition: width 0.3s ease;
}

.segmented-progress__segment.is-first {
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
}

.segmented-progress__segment.is-last {
  border-top-right-radius: inherit;
  border-bottom-right-radius: inherit;
}

.segmented-progress__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #606266;
}

.segmented-progress__legend.legend-right {
  flex-direction: column;
  margin-top: 0;
  margin-left: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-label {
  min-width: 28px;
}

.legend-value {
  font-weight: 600;
  color: #303133;
}

.segmented-progress__tooltip {
  white-space: nowrap;
}
</style>
