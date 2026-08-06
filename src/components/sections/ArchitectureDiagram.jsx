export default function ArchitectureDiagram({ diagram }) {
  if (!diagram) return <div className="notice">No architecture diagram is configured.</div>;
  const nodes=(diagram.architecture_nodes||[]).filter(node=>node.visibility);
  const links=(diagram.architecture_connections||[]).filter(link=>link.visibility);
  return <div className="arch" aria-label={diagram.title}><div className="arch-row">{nodes.map((node,index)=><div key={node.id} className="arch-node-wrap"><div className="arch-box"><span className="big">{node.icon||'▣'}</span><div>{node.title}</div><div className="label">{node.subtitle||node.description}</div></div>{index<nodes.length-1&&<div className="arch-arrow" title={links.find(link=>link.source_node_id===node.id)?.label}>→</div>}</div>)}</div></div>;
}
