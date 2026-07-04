export default function GroupCard({ group, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:12, padding:12, background:"#fff", border:"0.5px solid rgba(0,0,0,0.1)", borderRadius:8, marginBottom:8, cursor:"pointer", transition:"all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="#2a78d6"; e.currentTarget.style.background="#e6f1fb"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(0,0,0,0.1)"; e.currentTarget.style.background="#fff"; }}>
      <div style={{ width:40, height:40, borderRadius:10, background:"#f1f0ec", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{group.icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:500, fontSize:13 }}>{group.name}</div>
        <div style={{ fontSize:11, color:"#898781", marginTop:2 }}>{group.members?.length} members · {group.type}</div>
      </div>
    </div>
  );
}
