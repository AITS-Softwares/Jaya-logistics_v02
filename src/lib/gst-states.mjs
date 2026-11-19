// NIC master: https://docs.ewaybillgst.gov.in/apidocs/state-code.html
const states = {
  1:'Jammu and Kashmir',2:'Himachal Pradesh',3:'Punjab',4:'Chandigarh',5:'Uttarakhand',6:'Haryana',7:'Delhi',8:'Rajasthan',9:'Uttar Pradesh',10:'Bihar',11:'Sikkim',12:'Arunachal Pradesh',13:'Nagaland',14:'Manipur',15:'Mizoram',16:'Tripura',17:'Meghalaya',18:'Assam',19:'West Bengal',20:'Jharkhand',21:'Odisha',22:'Chhattisgarh',23:'Madhya Pradesh',24:'Gujarat',26:'Dadra and Nagar Haveli and Daman and Diu',27:'Maharashtra',29:'Karnataka',30:'Goa',31:'Lakshadweep',32:'Kerala',33:'Tamil Nadu',34:'Puducherry',35:'Andaman and Nicobar Islands',36:'Telangana',37:'Andhra Pradesh',38:'Ladakh',
};
const normalize = value => String(value || '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const codes = Object.fromEntries(Object.entries(states).map(([code,name]) => [normalize(name),code.padStart(2,'0')]));
Object.assign(codes,{orissa:'21',uttaranchal:'05',pondicherry:'34','andaman and nicobar':'35','jammu kashmir':'01','nct of delhi':'07','dadra and nagar haveli':'26','daman and diu':'26'});
export function gstStateCode(value) {
  if (/^\d{1,2}$/.test(String(value || '').trim())) {
    const code = Number(value);
    return states[code] ? String(code).padStart(2,'0') : '';
  }
  return codes[normalize(value)] || '';
}
export function gstStateLabel(value) {
  const code = gstStateCode(value);
  return code ? `${states[Number(code)]} (${code})` : '';
}
