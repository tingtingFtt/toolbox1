# 公共页面模板

管理页的公共结构在 `src/components/ui/ManagementChrome.tsx`，详情页在 `DetailChrome.tsx`，重复操作按钮在 `ActionButton.tsx`。新增模块直接组合这些组件；修改公共样式时只改模板。

## 管理页

```tsx
<ManagementHeader
  data-design-id="example-header-banner"
  icon={<FileText className="w-4 h-4" />}
  title="资源管理"
  badge="格式：.json"
  description="管理资源文件"
  actions={<ActionButton action="import" onClick={openFilePicker}>导入</ActionButton>}
/>
<ManagementToolbarFrame>
  <ManagementSearch value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索资源…" />
  {/* 分组、标签、排序、视图和选择按钮保持模块自身的状态与回调。 */}
</ManagementToolbarFrame>
<ManagementGrid>{items.map(renderResource)}</ManagementGrid>
```

`ManagementBatchOverlay` 提供跨三端的浮层定位，内嵌 `ManagementBatchBar` 提供批量栏的卡片样式。显示条件、已选数量及操作由页面负责。批量按钮使用 `context="batch"`；空选择是否禁用按各操作的原有规则处理。

## 详情页

```tsx
<DetailPanel onClick={e => e.stopPropagation()}>
  <DetailHeader designPrefix="example-detail" title={draft.name}
    version={draft.activeVersionLabel} badge={draft.category}
    tags={<TagEditor {...tagProps} />} actions={headerActions} onClose={close} />
  <DetailTabs designPrefix="example-detail" label="资源详情导航"
    tabs={[{ id: 'info', name: '基本属性' }, { id: 'entries', name: '条目' }]}
    activeTab={tab} onChange={setTab} />
  <DetailBody>{content}</DetailBody>
  <DetailFooter className="justify-end">
    <ActionButton action="close" context="detail" onClick={close}>关闭</ActionButton>
    <ActionButton action="save" context="detail" onClick={save}>保存全部修改</ActionButton>
  </DetailFooter>
</DetailPanel>
```

已有条件导航也可以组合 `DetailTabBar` 与 `DetailTabButton active={...}`，它们与 `DetailTabs` 使用同一套样式和可访问属性。顶栏用 `div`，避免全局 `header` 样式影响高度。导航始终保持一行并横向滚动，正文独立滚动，底栏允许换行。

## 按钮与主题

`action` 表达操作（create、import、export、save、delete、close、cancel、select、invert、move、tag、custom）；`context` 选择 toolbar、batch、detail 或 icon。保存和导入默认使用主色，删除使用危险色，其他使用次要样式；可用 `tone` 覆盖。标签、图标、事件处理和删除确认由调用方提供。

`disabled`、`loading`、`type`、`title`、`aria-label`、原生事件、ref、`designId` / `data-design-id` 均可透传。图标按钮必须提供明确的 `aria-label`。业务代码负责异步状态；`loading` 只提供禁用及 `aria-busy` 状态。

模板保留 `sub-interface-banner`、`header-icon-box`、`header-tag`、`resource-card-grid`、`batch-floating-card`、`file-detail-modal`、`tab-nav-bar`、`detail-footer` 等已有样式接口，继续支持主题和字体设置。断点、容器尺寸与底部安全区由 `src/styles/responsive.css` 统一处理。
