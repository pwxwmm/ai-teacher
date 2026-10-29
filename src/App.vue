<template>
  <n-message-provider>
    <n-layout has-sider style="height: 100vh">
      <n-layout-sider
        v-if="!isMobile"
        bordered
        :width="180"
        :collapsed-width="64"
        :collapsed="isTablet"
        class="app-sider"
      >
        <div class="logo">{{ isTablet ? "伴" : "AI 伴读" }}</div>
        <n-menu
          :options="menuOptions"
          :value="activeKey"
          :collapsed="isTablet"
          :collapsed-width="64"
          :collapsed-icon-size="24"
          @update:value="onSelect"
        />
        <div v-if="showContinue && !isTablet" class="continue-wrap">
          <n-button block secondary type="primary" @click="goContinueReading">
            继续阅读
          </n-button>
        </div>
        <div v-else-if="showContinue" class="continue-wrap tablet">
          <n-button text @click="goContinueReading">
            <n-icon :size="24"><ArrowRedoCircleOutline /></n-icon>
          </n-button>
        </div>
      </n-layout-sider>
      <n-layout-content ref="mainRef" class="main" :class="{ mobile: isMobile }">
        <router-view />
      </n-layout-content>
      <nav v-if="isMobile" class="tab-bar">
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
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutSider,
  NMenu,
  NMessageProvider,
} from "naive-ui";
import { h, type Component } from "vue";

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
.logo {
  padding: 18px 16px 10px;
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.continue-wrap {
  padding: 12px 12px 0;
  border-top: 1px solid #efeff5;
  margin-top: 8px;
}

/* 撑满侧栏右侧剩余宽度由 n-layout-content 提供（换成裸 div 会变成"内容多宽就多宽"，书架被压成单列） */
.continue-wrap.tablet {
  padding: 8px 4px 0;
  text-align: center;
}

.main {
  padding: 20px 24px;
  overflow: auto;
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

.main.mobile {
  padding: 12px;
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  background: #fff;
  border-top: 1px solid #efeff5;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  border: none;
  background: none;
  color: rgba(0, 0, 0, 0.5);
  font-size: 11px;
  cursor: pointer;
  min-width: 0;
}

.tab-item.active {
  color: #18a058;
}

.tab-item.continue {
  color: #2080f0;
}

.tab-icon {
  display: inline-flex;
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
