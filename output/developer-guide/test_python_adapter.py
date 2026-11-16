"""Offline behaviour tests. No Frappe site or statutory calls."""
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest

class Error(Exception): pass
class Doc(dict):
    __getattr__ = dict.get
    def __setattr__(self,k,v): self[k]=v
    def check_permission(self,*a): pass
    def save(self): return self

class AdapterTests(unittest.TestCase):
    def setUp(self):
        self.records={};self.calls=[];self.pdf_fail=False;self.generate_fail=False
        self.details={"ewbNo":"123456789012","status":"ACT","validUpto":"20/11/2099 11:59:00 PM","docNo":"INV1","docDate":"16/11/2026","totInvValue":100,"fromGstin":"FROM","toGstin":"TO","VehiclListDetails":[{"vehicleNo":"MH12AB1222"}]}
        fake=types.ModuleType("frappe")
        fake.session=Doc(user="integration");fake.PermissionError=Error
        fake.get_roles=lambda:["Jaya Ewaybill Integration"]
        fake.whitelist=lambda **kw:lambda f:f
        fake.throw=lambda msg,*a: (_ for _ in ()).throw(Error(msg))
        fake.parse_json=json.loads;fake.as_json=json.dumps
        fake.get_all=lambda *a,**kw:[]
        def get_doc(kind,name=None):
            if isinstance(kind,dict):return Doc(kind)
            if kind=='Company':return Doc(gstin='27AAAAA0000A1Z5')
            return self.records[name]
        fake.get_doc=get_doc
        fake.db=types.SimpleNamespace(exists=lambda kind,name:name in self.records,sql=lambda *a:None,commit=lambda:None)
        def pdf(*a,**kw):
            if self.pdf_fail:raise Error('renderer failed')
            return b'%PDF-1.4 test'
        fake.get_print=pdf
        sys.modules['frappe']=fake
        path=Path(__file__).parent/'python-starter/jaya_integration/api/ewaybill.py'
        spec=importlib.util.spec_from_file_location('adapter',path);self.m=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.m)
        self.api=types.SimpleNamespace(generate_e_waybill=self.gen,get_e_waybill=self.get)
        self.m._api=lambda gstin:self.api
        self.lr={"invoice":{"boeInvoiceNo":"INV1","boeInvoiceDate":"2026-11-16","invoiceValue":"100"},"consignor":{"gstNumber":"FROM"},"consignee":{"gstNumber":"TO"},"header":{"vehicleNo":"MH12AB1222"}}
        self.args=dict(company='Company',gstin='27AAAAA0000A1Z5',external_id='lr-ewaybill-'+'a'*24,lr=self.lr)
    def gen(self,payload):
        self.calls.append('generate')
        if self.generate_fail:raise Error('timeout')
        return {"ewayBillNo":"123456789012","validUpto":"20/11/2099 11:59:00 PM"}
    def get(self,number):self.calls.append('fetch');return self.details
    def prepare(self):
        payload={k:1 for k in ("supplyType","subSupplyType","docType","docDate","fromPincode","toPincode","transDistance","transMode","itemList","totInvValue")}
        payload.update(docDate='16/11/2026',totInvValue=100,docNo='INV1',fromGstin='FROM',toGstin='TO',vehicleNo='MH12AB1222')
        name=self.m._name(self.args['company'],self.args['gstin'],self.args['external_id'])
        doc=Doc(company=self.args['company'],gstin=self.args['gstin'],external_id=self.args['external_id'],state='Prepared',payload_json=json.dumps(payload))
        self.records[name]=doc;return doc
    def test_unprepared_generation_has_no_call(self):
        with self.assertRaises(Error):self.m.generate(**self.args)
        self.assertEqual(self.calls,[])
    def test_company_mismatch_has_no_call(self):
        with self.assertRaises(Error):self.m.fetch(**{**self.args,'gstin':'29AAAAA0000A1Z5'},ewaybill_no='123456789012')
        self.assertEqual(self.calls,[])
    def test_generate_and_repeat_reuses_success(self):
        self.prepare();result=self.m.generate(**self.args)
        self.assertEqual(result['ewaybillNo'],'123456789012');self.assertIn('pdfBase64',result)
        self.m.generate(**self.args);self.assertEqual(self.calls.count('generate'),1)
    def test_uncertain_generation_blocks_retry(self):
        doc=self.prepare();self.generate_fail=True
        with self.assertRaises(Error):self.m.generate(**self.args)
        self.assertEqual(doc.state,'Uncertain')
        with self.assertRaises(Error):self.m.generate(**self.args)
        self.assertEqual(self.calls.count('generate'),1)
    def test_fetch_mismatch_and_inactive_rejected(self):
        self.details['docNo']='OTHER'
        with self.assertRaises(Error):self.m.fetch(**self.args,ewaybill_no='123456789012')
        self.details['docNo']='INV1';self.details['status']='CAN'
        with self.assertRaises(Error):self.m.fetch(**self.args,ewaybill_no='123456789012')
    def test_pdf_failure_preserves_generation(self):
        self.prepare();self.pdf_fail=True
        result=self.m.generate(**self.args)
        self.assertEqual(result['ewaybillNo'],'123456789012');self.assertTrue(result['pdfPending'])
    def test_fetch_success(self):
        result=self.m.fetch(**self.args,ewaybill_no='123456789012')
        self.assertEqual(result['ewaybillNo'],'123456789012');self.assertIn('pdfBase64',result)

if __name__=='__main__':unittest.main()
