function groupRoutes(routes) {
  const groups = new Map();
  for (const route of routes) {
    const key = [route.plantName, route.plantCode].map(value => String(value || '').trim().toLowerCase()).join('|');
    if (!groups.has(key)) groups.set(key, { name: route.plantName || '—', code: route.plantCode, routes: [] });
    groups.get(key).routes.push(route);
  }
  return [...groups.values()];
}
export function PdiPlantCell({ routes }) {
  const groups = groupRoutes(routes);
  if (!groups.length) return <span className="text-slate-400">—</span>;
  return <div className="min-w-[90px] space-y-3">{groups.map((group, index) => <div key={index}><div className="font-medium leading-5 text-slate-800">{group.name}</div>{group.code && <div className="mt-0.5 whitespace-nowrap text-xs leading-4 text-slate-500">{group.code}</div>}</div>)}</div>;
}
