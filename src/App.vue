<template>
  <n-config-provider :theme-overrides="appleTheme">
    <n-message-provider>
      <n-layout has-sider style="height: 100vh">
      <n-layout-sider
        v-if="!isMobile && !isTablet"
        :width="180"
        class="app-sider"
      >
        <div class="logo" data-tauri-drag-region>AI 伴读</div>
        <n-menu
          :options="menuOptions"
          :value="activeKey"
          @update:value="onSelect"
        />
        <div v-if="showContinue" class="continue-wrap">
          <n-button block secondary type="primary" @click="goContinueReading">
            继续阅读
          </n-button>
        </div>
      </n-layout-sider>
      <!-- 平板区间：自绘 64px 图标栏 -->
      <aside v-else-if="isTablet" class="tablet-rail">
        <div class="rail-logo" data-tauri-drag-region>伴</div>
        <button
          v-for="item in menuOptions"
          :key="item.key"
          class="rail-item"
          :class="{ active: activeKey === item.key }"
          @click="onSelect(item.key as string)"
        >
          <span class="rail-icon">
            <component :is="item.icon" />
          </span>
        </button>
        <button
          v-if="showContinue"
          class="rail-item continue"
          @click="goContinueReading"
        >
          <span class="rail-icon">
            <n-icon :size="22"><ArrowRedoCircleOutline /></n-icon>
          </span>
        </button>
      </aside>
      <n-layout-content
        ref="mainRef"
        class="main"
        :class="{ mobile: isMobile, reading: isReadingRoute }"
      >
        <router-view />
      </n-layout-content>
      <nav v-if="isMobile && !isReadingRoute" class="tab-bar">
        <button
          v-for="item in menuOptions"
          :key="item.key"
          class="tab-item"
          :class="{ active: activeKey === item.key }"
          @click="onSelect(item.key as string)"
        >
          <span class="tab-icon">
            <component :is="item.icon" />
          </span>
          <span class="tab-label">{{ item.label }}</span>
        </button>
        <button
          v-if="showContinue"
          class="tab-item continue"
          @click="goContinueReading"
        >
          <span class="tab-icon">
            <n-icon :size="22"><ArrowRedoCircleOutline /></n-icon>
          </span>
          <span class="tab-label">继续阅读</span>
        </button>
      </nav>
      </n-layout>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BookmarkOutline,
  ArrowRedoCircleOutline,
  BookOutline,
  CalendarOutline,
  SettingsOutline,
} from "@vicons/ionicons5";
import {
  NButton,
  NConfigProvider,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  NMessageProvider,
} from "naive-ui";
import { h, type Component } from "vue";
import { appleTheme } from "./theme";

function icon(c: Component) {
  return () => h(NIcon, null, { default: () => h(c) });
}

const route = useRoute();
const router = useRouter();

// 端设备自适应断点（CSS px）：
// ≤820 手机/iPad mini 竖屏 → 侧边栏换底部 Tab 栏；821–1100 iPad 竖屏/窄窗口 → 图标侧栏
const MOBILE_MAX = 820;
const TABLET_MAX = 1100;

const windowWidth = ref(window.innerWidth);
const isMobile = computed(() => windowWidth.value <= MOBILE_MAX);
const isTablet = computed(
  () => windowWidth.value > MOBILE_MAX && windowWidth.value <= TABLET_MAX,
);

function onResize() {
  windowWidth.value = window.innerWidth;
}

onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

const menuOptions = [
  { label: "今日学习", key: "/today", icon: icon(CalendarOutline) },
  { label: "书架", key: "/library", icon: icon(BookOutline) },
  { label: "错题本", key: "/wrong", icon: icon(BookmarkOutline) },
  { label: "设置", key: "/settings", icon: icon(SettingsOutline) },
];

const isReadingRoute = computed(() => route.path.startsWith("/reading/"));

const activeKey = computed(() => {
  if (
    route.path.startsWith("/library") ||
    route.path.startsWith("/books") ||
    route.path.startsWith("/reading") ||
    route.path.startsWith("/quiz")
  ) {
    return "/library";
  }
  if (route.path.startsWith("/wrong")) return "/wrong";
  if (route.path.startsWith("/settings")) return "/settings";
  return "/today";
});

function onSelect(key: string) {
  router.push(key);
}

// 记住最近阅读位置（进过任意阅读页即更新），随时一键回去；localStorage 持久，重开应用也在
const LAST_READING_KEY = "ai-teacher:last-reading";

function loadLastReading(): string | null {
  try {
    return localStorage.getItem(LAST_READING_KEY);
  } catch {
    return null;
  }
}

const lastReading = ref<string | null>(loadLastReading());

watch(
  () => route.path,
  (p) => {
    if (!p.startsWith("/reading/")) return;
    lastReading.value = p;
    try {
      localStorage.setItem(LAST_READING_KEY, p);
    } catch {
      /* 本地存储不可用时仅本次运行内记忆 */
    }
  },
);

const showContinue = computed(
  () => lastReading.value !== null && !route.path.startsWith("/reading/"),
);

function goContinueReading(): void {
  if (lastReading.value) router.push(lastReading.value);
}

// 换页时把主内容区滚回顶部：滚动容器 .main 为所有页面共享，长页滚到底再进短页时
// 旧滚动位置会把新页内容顶出视口（表现为"点去做题白屏"）
const mainRef = ref<InstanceType<typeof NLayoutContent> | null>(null);
watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    (mainRef.value?.$el as HTMLElement | undefined)?.scrollTo({ top: 0 });
  },
);
</script>

<style scoped>
/* ---------- 桌面侧栏（Apple 总支栏体系） ---------- */

.app-sider {
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
}

.app-sider :deep(.n-layout-sider__content) {
  background: transparent;
}

.app-sider :deep(.n-menu) {
  background: transparent;
  padding: 12px;
}

/* 菜单项：Apple Music 风——选中 = 纯白 pill + 轻微抬起压力*/
.app-sider :deep(.n-menu-item) {
  --n-item-color-hover: rgba(0, 0, 0, 0.045);
  --n-item-color-active: rgba(0, 0, 0, 0.045);
  --n-item-color-active-hover: rgba(0, 0, 0, 0.06);
  --n-item-icon-size: 18px;
  border-radius: 7px;
}

.app-sider :deep(.n-menu-item-content) {
  border-radius: 7px;
}

.app-sider :deep(.n-menu-item-content--selected) {
  background: #ffffff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.07),
    0 1px 2px rgba(0, 0, 0, 0.04);
  font-weight: 600;
}

.app-sider :deep(.n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--color-accent);
}

/* 左上角 logo 区充当窗口拖动区（Overlay 标题栏），红绿灯叠在上层 */
.logo {
  padding: 26px 14px 10px 76px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-primary);
}

.continue-wrap {
  padding: 12px 12px 0;
  border-top: 1px solid var(--border-subtle);
  margin-top: 8px;
}

/* ---------- 平板区间 64px 图标栏 ---------- */

.tablet-rail {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 26px 8px 12px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
}

.rail-logo {
  padding: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  color: var(--text-primary);
}

.rail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border: none;
  border-radius: 7px;
  background: none;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.12s ease;
  width: 100%;
}

.rail-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.rail-item.active {
  background: rgba(0, 0, 0, 0.07);
  color: var(--color-accent);
}

.rail-item.continue {
  color: var(--color-accent-info);
  margin-top: auto;
  border-top: 1px solid var(--border-subtle);
  border-radius: 0;
}

.rail-icon {
  display: inline-flex;
  font-size: 21px;
  line-height: 1;
}

/* ---------- 主内容区 ---------- */

.main {
  padding: 24px 28px;
  overflow: auto;
  background: var(--bg-content);
}

.main.mobile {
  padding: 16px 16px;
  padding-bottom: calc(86px + env(safe-area-inset-bottom, 0px));
}

/* 阅读页全屏：Tab 栏收起后不再预留其占位 */
.main.mobile.reading {
  padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
}

/* ---------- 手机端 Tab 栏 ---------- */

.tab-bar {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 100;
  display: flex;
  align-items: stretch;
  border-radius: 26px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.62);
  -webkit-backdrop-filter: blur(34px) saturate(190%);
  backdrop-filter: blur(34px) saturate(190%);
  border: 0.5px solid rgba(255, 255, 255, 0.55);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    inset 0 -1px 0 rgba(0, 0, 0, 0.03),
    0 10px 32px rgba(15, 35, 60, 0.16);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 9px 4px 7px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  min-width: 0;
  /* Apple 规范：可点触控区 ≥44pt */
  min-height: 44px;
  transition: color 0.12s ease;
}

.tab-item.active {
  color: var(--color-accent);
  /* iOS 26 选中项：小型玻璃透镜（高光内边 + 微投影） */
  background: rgba(255, 255, 255, 0.6);
  border-radius: 18px;
  margin: 4px;
  padding: 5px 0 3px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 1px 6px rgba(0, 0, 0, 0.06);
}

.tab-item.continue {
  color: var(--color-accent-info);
}

.tab-icon {
  display: inline-flex;
  /* SF Symbols Tab 栏图标的常见光学尺寸 */
  font-size: 24px;
  line-height: 1;
}

.tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  font-weight: 500;
}

/* 阅读页：外层不再整页滚动，正文列与领读列各在自己内部滚（各一条滚动条）。
   ⚠ n-layout-content 内部会再套两层 .n-layout-scroll-container，所以 .reading-page 不是 .main 的直接子元素：
   - 不能用 .main:has(> .reading-page)（一直没命中，两列被内容撑高、滚动全落在整页上，只剩一条滚动条）
   - 也不能只给 .reading-page 设 display:flex; flex:1：父级是 block，flex 子项不会收缩，照样被内容撑高
   必须像下面这样把每一层都钉成定高/定网格，最后两列各自 overflow-y:auto 才有各自的滚动条 */
.main:has(.reading-page) {
  height: 100%;
  overflow: hidden;
}

/* n-layout-content 内部因此多出两层 .n-layout-scroll-container（外层 flex 行、内层滚动容器），
   逐层把高度钉死为 100% 并禁用它们自身的滚动，滚动交给正文列 / 领读列 */
.main:has(.reading-page) .n-layout-scroll-container {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.main:has(.reading-page) > .n-layout-scroll-container {
  display: flex;
  flex-direction: column;
}

.main:has(.reading-page) > .n-layout-scroll-container > .n-layout-scroll-container {
  flex: 1;
  padding: 20px 24px;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: minmax(0, 1fr);
}

.main:has(.reading-page) .reading-page {
  min-height: 0;
  height: 100%;
  padding-bottom: 0;
}

.main:has(.reading-page) .reading-main {
  display: flex;
  min-height: 0;
  align-items: stretch;
}

@media (max-width: 900px) {
  .main:has(.reading-page) {
    height: auto;
    overflow: auto;
  }

  .main:has(.reading-page) .reading-page {
    display: block;
    padding-bottom: 48px;
  }
}
</style>
