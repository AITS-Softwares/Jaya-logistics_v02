// Order list responses use scalar IDs; order detail responses may populate them.
export function vnnCompanyId(value) {
 if(typeof value==='string')return value.trim()||null;
 if(value&&typeof value==='object'&&value._id!==value)return vnnCompanyId(value._id);
 return null;
}
export function normalizeVnnOrderPanel(panel) {
 if(!panel)return panel;
 const company=panel.subCompanyId;
 return {...panel,subCompanyId:vnnCompanyId(company),
  subCompanyName:panel.subCompanyName||(typeof company==='object'?company?.name:'')||'',
  subCompanyCode:panel.subCompanyCode||(typeof company==='object'?company?.code:'')||''};
}
