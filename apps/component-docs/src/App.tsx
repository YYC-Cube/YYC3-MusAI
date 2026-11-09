import { useEffect, useMemo, useState } from 'react';
import { applyTheme, THEME_IDS, type ThemeId } from '@yyc3/music-design-tokens';
import registryData from './registry.generated.json';
import { demos } from './demos';

interface RegistryComponent {
  name: string;
  package: string;
  version: string;
  category: string;
  description: string;
  props: string[];
  source: string;
  demo: string | null;
  example: string | null;
}

interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  componentCount: number;
}

const registry = registryData as unknown as {
  schemaVersion: string;
  generatedAt: string;
  totals: { packages: number; components: number; curated: number };
  packages: RegistryPackage[];
  components: RegistryComponent[];
};

const keyOf = (c: RegistryComponent) => `${c.package}::${c.name}`;
const initial = registry.components.find((c) => c.name === 'DButton') ?? registry.components[0];

interface SidebarProps {
  query: string;
  onQueryChange: (value: string) => void;
  grouped: Array<[string, RegistryComponent[]]>;
  selected: RegistryComponent | undefined;
  onSelect: (key: string) => void;
}

function Sidebar({ query, onQueryChange, grouped, selected, onSelect }: SidebarProps) {
  return (
    <>
      <div className="border-b border-white/10 p-3">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索组件 / 包 / 分类"
          aria-label="搜索组件"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none placeholder:text-white/25"
        />
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2 text-sm">
        {grouped.map(([pkg, components]) => (
          <section key={pkg} className="mb-3">
            <h2 className="px-2 py-1 text-[11px] uppercase tracking-wider text-white/35">{pkg}</h2>
            <ul>
              {components.map((component) => {
                const active = selected && keyOf(component) === keyOf(selected);
                return (
                  <li key={component.name}>
                    <button
                      onClick={() => onSelect(keyOf(component))}
                      className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                        active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      {component.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {grouped.length === 0 && <p className="px-2 py-6 text-center text-xs text-white/30">没有匹配的组件</p>}
      </nav>
    </>
  );
}

export function App() {
  const [query, setQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState(initial ? keyOf(initial) : '');
  const [theme, setTheme] = useState<ThemeId>('deep-space');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    try {
      applyTheme(theme);
    } catch {
      // 主题应用失败不阻断文档浏览
    }
  }, [theme]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return registry.components;
    return registry.components.filter((c) =>
      [c.name, c.package, c.category, c.description].some((v) => v.toLowerCase().includes(keyword))
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, RegistryComponent[]>();
    for (const component of filtered) {
      const list = map.get(component.package) ?? [];
      list.push(component);
      map.set(component.package, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const selected = registry.components.find((c) => keyOf(c) === selectedKey) ?? filtered[0] ?? initial;
  const Demo = selected ? demos[selected.name] : undefined;

  const select = (key: string) => {
    setSelectedKey(key);
    setNavOpen(false);
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="打开组件目录"
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 md:hidden"
          >
            目录
          </button>
          <div className="flex items-baseline gap-3">
            <h1 className="text-base font-semibold tracking-wide md:text-lg">YYC³ 组件文档</h1>
            <span className="hidden text-xs text-white/40 sm:inline">
              {registry.totals.packages} 包 · {registry.totals.components} 组件 · {registry.totals.curated} 个示例
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/50">
          主题
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemeId)}
            className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white/80 outline-none"
          >
            {THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-80 shrink-0 flex-col border-r border-white/10 md:flex">
          <Sidebar
            query={query}
            onQueryChange={setQuery}
            grouped={grouped}
            selected={selected}
            onSelect={setSelectedKey}
          />
        </aside>

        {navOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="组件目录">
            <div className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col border-r border-white/10 bg-[#0A0E2F]">
              <div className="flex items-center justify-between border-b border-white/10 p-3">
                <span className="text-sm font-medium">组件目录</span>
                <button
                  onClick={() => setNavOpen(false)}
                  aria-label="关闭组件目录"
                  className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10"
                >
                  关闭
                </button>
              </div>
              <Sidebar
                query={query}
                onQueryChange={setQuery}
                grouped={grouped}
                selected={selected}
                onSelect={select}
              />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          {selected ? (
            <article className="mx-auto max-w-4xl space-y-6">
              <header>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{selected.name}</h2>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                    {selected.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/45">
                  {selected.package}@{selected.version} · {selected.source}
                </p>
                <p className="mt-3 text-sm text-white/70">{selected.description}</p>
              </header>

              <section className="rounded-xl border border-white/10 bg-black/25 p-4">
                <h3 className="mb-2 text-xs uppercase tracking-wider text-white/35">引入</h3>
                <pre className="overflow-x-auto text-xs text-emerald-300">
                  {`import { ${selected.name} } from '${selected.package}'`}
                </pre>
              </section>

              {Demo && (
                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-white/35">实时示例</h3>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:p-6">
                    <Demo />
                  </div>
                </section>
              )}

              {selected.example && (
                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-white/35">示例代码</h3>
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-white/70">
                    {selected.example}
                  </pre>
                </section>
              )}

              <section>
                <h3 className="mb-2 text-xs uppercase tracking-wider text-white/35">Props</h3>
                {selected.props.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.props.map((prop) => (
                      <code key={prop} className="rounded-md bg-white/5 px-2 py-1 text-xs text-sky-300">
                        {prop}
                      </code>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30">未从源码中提取到 Props 接口，详见源码与类型声明。</p>
                )}
              </section>

              <footer className="border-t border-white/10 pt-3 text-[11px] text-white/25">
                registry.json v{registry.schemaVersion} · 生成于 {registry.generatedAt}
              </footer>
            </article>
          ) : (
            <p className="text-sm text-white/40">注册表为空，请先运行 `pnpm registry:build`。</p>
          )}
        </main>
      </div>
    </div>
  );
}
