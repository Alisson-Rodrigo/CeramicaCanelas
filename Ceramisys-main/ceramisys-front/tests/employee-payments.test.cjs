/* eslint-disable @typescript-eslint/no-require-imports -- Existing Node/TypeScript test harness, no new dependency. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function load(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = new Module(file, module); mod.paths = module.paths; mod.require = name => dependencies[name] ?? require(name); mod._compile(source, file); return mod.exports;
}
const calls = []; let response = { status: 200, data: [] }; let failure;
const api = Object.fromEntries(['get','post','put','patch','delete'].map(method => [method, async (...args) => { calls.push([method,...args]); if (failure) throw failure; return response; }]));
const neutral = load('lib/payments.ts', { './api': { api } });
const m = load('lib/employee-payments.ts', { './api': { api }, './payments': neutral });
const service = m.employeePayments;
const period = { personId:'employee', year:2026, month:11, fortnight:1 };
const calculation = { paymentPersonId:'employee', competenceYear:2026, competenceMonth:11, fortnight:1, voucherSelections:[], accountantAmount:800 };
const absence = { date:'2026-11-02', isHalf:false, observation:'', isCancelled:false, revision:4, correctClosedPeriod:false };

const strictSummary = {person:{id:'employee',name:'Employee'},year:2026,month:11,fullAbsences:1,halfAbsences:1,occurrences:[{date:'2026-11-10',isHalf:false}],hours:{positiveMinutes:330,negativeMinutes:135,balanceMinutes:195,positiveHours:'+05:30',negativeHours:'-02:15',balanceHours:'+03:15'}};
test('all 41 dedicated operations use exact paths and HTTP formats',async()=>{
 const form=new FormData(),reason={reason:'Test',revision:4};
  const operations = [
    ['get','/people',()=>service.people()],['post','/people',()=>service.createPerson(form)],['patch','/people/employee/salary',()=>service.salary('employee',form)],['patch','/people/employee/status',()=>service.status('employee',false)],['delete','/people/employee',()=>service.deletePerson('employee',reason)],
    ['get','/people/employee/vouchers',()=>service.vouchers(period)],['post','/people/employee/vouchers',()=>service.createVoucher('employee',form)],['patch','/vouchers/v/status',()=>service.voucherStatus('v',4)],['delete','/vouchers/v',()=>service.deleteVoucher('v',reason)],
    ['get','/people/employee/absences',()=>service.absences(period)],['post','/people/employee/absences',()=>service.createAbsence('employee',absence)],['put','/people/employee/absences/a',()=>service.updateAbsence('employee','a',absence)],['delete','/people/employee/absences/a',()=>service.deleteAbsence('employee','a',reason)],['patch','/people/employee/absences/a/review',()=>service.reviewAbsence('employee','a',{isReviewed:true,revision:4})],
    ['get','/people/employee/accountant-summary',()=>service.accountant(period)],['post','/people/employee/accountant-submissions',()=>service.createSubmission('employee',{year:2026,month:11,reference:'test',})],['get','/people/employee/accountant-submissions',()=>service.submissions(period)],['get','/people/employee/monthly-summary',()=>service.monthly(period)],['get','/people/employee/audit',()=>service.audit('employee')],
    ['post','/calculations/preview',()=>service.preview(calculation)],['post','/calculations',()=>service.confirm(calculation)],['get','/calculations',()=>service.history({year:2026,month:11})],['patch','/calculations/c/paid',()=>service.paid('c','2026-11-30T15:00:00Z')],['delete','/calculations/c',()=>service.cancel('c',reason)],
    ['post','/preparations',()=>service.savePreparation(calculation,true,4)],['get','/preparations',()=>service.preparation(period)],['delete','/preparations/p',()=>service.deletePreparation('p',reason)],
    ['get','/calculations/c/adjustments',()=>service.adjustments('c')],['post','/calculations/c/adjustments',()=>service.createAdjustment('c',{reference:'ref',amount:-50,reason:'Correction'})],['patch','/calculations/c/adjustments/paid',()=>service.payAdjustments('c',' ref ','2026-11-30T15:00:00Z')],
    ['get','/calculations/export',()=>service.exportPdf(false,{year:2026})],['get','/calculations/bonuses/export',()=>service.legacyBonusPdf({year:2026,month:11})],['get','/rules',()=>service.rules()],
 ['get','/people/employee/hours',()=>service.hours(period)],['post','/people/employee/hours',()=>service.createHours('employee',{date:'2026-11-10',positiveMinutes:330,negativeMinutes:135,notes:'',revision:0,isCancelled:false,correctClosedPeriod:false})],['put','/people/employee/hours/h',()=>service.updateHours('employee','h',{date:'2026-11-10',positiveMinutes:330,negativeMinutes:135,notes:'cancel',revision:2,isCancelled:true,correctClosedPeriod:false})],
 ['get','/reports/accountant/export',()=>service.download('accountant',period)],['get','/reports/vouchers',()=>service.voucherSheet(period)],['get','/reports/vouchers/export',()=>service.download('vouchers',period)],['get','/reports/bonuses',()=>service.bonuses(period)],['get','/reports/bonuses/export',()=>service.download('bonuses',period)],
  ];
 assert.equal(operations.length,41);
 for(const [verb,route,action] of operations){let data=[];let type='application/json';if(route==='/people/employee/accountant-summary')data=strictSummary;else if(route.endsWith('/export')){type=route.includes('vouchers')?'text/csv; charset=utf-8':'application/pdf';data=new Blob([type.startsWith('text/csv')?'\uFEFFnome;valor\nPessoa;1':'%PDF-fixture'],{type});}
 response={status:200,data,headers:{'content-type':type}};const count=calls.length;await action();assert.equal(calls.length,count+1);assert.equal(calls.at(-1)[0],verb);assert.equal(calls.at(-1)[1],'/api/employee-payments'+route);
 }
});
test('manual amount is required in both fortnights, including preview/preparation, and zero is allowed',async()=>{
 for(const fortnight of [1,2]){assert.throws(()=>m.employeeCalculationForm({...calculation,fortnight,accountantAmount:undefined}),/manual/);const form=m.employeeCalculationForm({...calculation,fortnight,accountantAmount:0});assert.equal(form.get('AccountantAmount'),'0');assert.equal(form.has('AccountantAmountMode'),false);assert.equal(form.has('AdditionsJson'),false);assert.equal(form.has('PositiveMinutes'),false);}
 response={status:200,data:{}};await service.savePreparation({...calculation,fortnight:2,accountantAmount:1200},true,3);assert.equal(calls.at(-1)[2].calculation.accountantAmount,1200);assert.equal(calls.at(-1)[2].revision,3);
 assert.throws(()=>m.employeeCalculationPayload({...calculation,additions:[{amount:1}]}));assert.throws(()=>m.employeeCalculationPayload({...calculation,accountantAmountMode:2}));
});
test('no operational link/category/DSR is sent and editing preserves optional fields',()=>{
 const form=m.employeePersonForm({name:'Employee',monthlyValue:'2000',employeeId:'MUST-NOT-SEND'},true);assert.equal(form.has('EmployeeId'),false);assert.equal(form.has('EmploymentType'),false);assert.equal(form.has('ContractualDsrAuthorized'),false);
 assert.deepEqual([...m.employeePersonForm({monthlyValue:'2000',monthlyBonus:'',admissionDate:''},false).keys()],['MonthlyValue']);assert.equal(m.employeePersonForm({monthlyValue:'2000',monthlyBonus:'0'},false).get('MonthlyBonus'),'0');
 const voucher=m.employeeVoucherForm({description:'Vale',value:'300',date:'2026-11-01',referenceYear:2026,referenceMonth:11,allowPartialDiscount:false});assert.equal(voucher.has('AllowPartialDiscount'),false);assert.equal(voucher.has('PaymentPersonId'),false);
});
test('explicit voucher selection permits partial discounts even with old false flag',()=>{
 const voucher={id:'v',pendingBalance:300,allowPartialDiscount:false,availableForDiscount:true};assert.deepEqual(m.employeeSelections({},[voucher]),[]);assert.deepEqual(m.employeeSelections({v:'100'},[voucher]),[{voucherId:'v',amount:100}]);
 for(const value of ['301','0','-1','1.001'])assert.throws(()=>m.employeeSelections({v:value},[voucher]));assert.throws(()=>m.employeeSelections({v:'1'},[{...voucher,availableForDiscount:false}]));assert.throws(()=>m.employeeCalculationPayload({...calculation,voucherSelections:[{voucherId:'v',amount:1},{voucherId:'v',amount:1}]}));
});
test('second confirmation requires first paid; never derives the second amount',()=>{
 assert.ok(m.canConfirmEmployee({...calculation,fortnight:2},[{fortnight:1,status:2}]));assert.equal(m.canConfirmEmployee({...calculation,fortnight:2,accountantAmount:1200},[{fortnight:1,status:3}]),null);assert.equal(m.employeeCalculationForm({...calculation,fortnight:2,accountantAmount:1200}).get('AccountantAmount'),'1200');
});
test('strict accountant projection strips all internal/financial data including nested metadata',()=>{
 const result=m.strictAccountantSummary({...strictSummary,employeeClosing:{salary:2000},vouchers:[{}],notes:'INTERNAL',person:{...strictSummary.person,monthlyValue:2000},occurrences:[{date:'2026-11-10',isHalf:false,observation:'INTERNAL',recordedBy:'id',isCancelled:false}]});assert.deepEqual(Object.keys(result).sort(),['person','year','month','fullAbsences','halfAbsences','occurrences','hours'].sort());assert.deepEqual(result.person,strictSummary.person);assert.equal(JSON.stringify(result).includes('INTERNAL'),false);assert.throws(()=>m.strictAccountantSummary({person:strictSummary.person}));
});
test('accountant submission sends reference only and reports never include fortnight query',async()=>{
 response={status:200,data:[]};await service.createSubmission('employee',{year:2026,month:11,reference:'monthly'});assert.deepEqual(calls.at(-1)[2],{year:2026,month:11,reference:'monthly'});await service.bonuses({...period,fortnight:1});assert.deepEqual(calls.at(-1)[2].params,{year:2026,month:11,personId:'employee'});
});
test('hours accept nonnegative integer magnitudes, preserve revision and cancel through PUT',async()=>{
 const body={date:'2026-11-10',positiveMinutes:330,negativeMinutes:135,notes:'',isCancelled:false,revision:2,correctClosedPeriod:false};assert.deepEqual(m.employeeTimeRequest(body),body);for(const invalid of [{negativeMinutes:-1},{positiveMinutes:1.5},{positiveMinutes:0,negativeMinutes:0}])assert.throws(()=>m.employeeTimeRequest({...body,...invalid}));assert.throws(()=>m.employeeTimeRequest({...body,correctClosedPeriod:true}));
 response={status:200,data:{}};await service.updateHours('employee','h',{...body,isCancelled:true,notes:'Cancel'});assert.equal(calls.at(-1)[0],'put');assert.equal(calls.at(-1)[2].revision,2);
});
test('preparation restores PascalCase manual data and rejects superseded automatic calculations',()=>{
 const c=m.restoreEmployeeCalculation(JSON.stringify(JSON.stringify({PaymentPersonId:'employee',CompetenceYear:2026,CompetenceMonth:11,Fortnight:1,AccountantAmount:0,VoucherSelections:[]})));assert.equal(c.accountantAmount,0);assert.throws(()=>m.restoreEmployeeCalculation(JSON.stringify({PaymentPersonId:'employee',CompetenceYear:2026,CompetenceMonth:11,Fortnight:1})));
});
test('files are authenticated blobs with correct types and safe disposition; JSON errors surface',async()=>{
 response={status:200,data:new Blob(['%PDF-fixture'],{type:'application/pdf'}),headers:{'content-type':'application/pdf','content-disposition':"attachment; filename*=UTF-8''resumo%20mensal.pdf"}};assert.equal((await service.download('accountant',period)).filename,'resumo mensal.pdf');
 response={status:200,data:new Blob(['\uFEFFnome;valor\nTeste;1'],{type:'text/csv; charset=utf-8'}),headers:{'content-type':'text/csv; charset=utf-8'}};const csv=await service.download('vouchers',period);assert.ok(csv.filename.endsWith('.csv'));assert.equal(new Uint8Array(await csv.blob.arrayBuffer())[0],239);
 response={status:200,data:new Blob(['{}'],{type:'application/json'}),headers:{'content-type':'application/json'}};await assert.rejects(service.download('accountant',period),/formato/);
 failure={response:{data:new Blob([JSON.stringify({message:'Filtro inválido'})],{type:'application/json'}),status:400}};await assert.rejects(service.download('vouchers',period),e=>e.response.data.message==='Filtro inválido');failure=undefined;
});
test('204, revisions, UTC and exact adjustment reference remain preserved with no retry',async()=>{
 response={status:204,data:''};assert.equal(await service.preparation(period),null);await service.deleteAbsence('employee','a',m.employeeDeletion('Reason',4,true));assert.deepEqual(calls.at(-1)[2].data,{reason:'Reason',revision:4,correctClosedPeriod:true});await service.paid('c','2026-11-16T12:00:00Z');assert.equal(calls.at(-1)[2].get('PaidAt'),'2026-11-16T12:00:00Z');await service.payAdjustments('c',' exact ','2026-11-16T12:00:00Z');assert.equal(calls.at(-1)[2].reference,' exact ');failure={response:{status:400}};const before=calls.length;await assert.rejects(service.confirm(calculation));assert.equal(calls.length,before+1);failure=undefined;
});
test('paid snapshots and second period dependencies block cancellation',()=>{
 const h={id:'c',paymentPersonId:'employee',competenceYear:2026,competenceMonth:11,fortnight:1,status:2,paidAt:null};assert.equal(m.employeeCancellationBlock(h,[],[]),null);assert.ok(m.employeeCancellationBlock({...h,status:3},[],[]));assert.ok(m.employeeCancellationBlock(h,[{...h,fortnight:2}],[]));assert.ok(m.employeeCancellationBlock(h,[],[{}]));
});
test('payments has one entry; old links redirect; no operational lookup, FinalNet or automatic 40 percent UI',()=>{
 const sidebar=fs.readFileSync('components/Sidebar.tsx','utf8');assert.equal((sidebar.match(/id: 'payments'/g)||[]).length,1);assert.equal(sidebar.includes("id: 'employee-payments'"),false);assert.ok(fs.readFileSync('app/dashboard/employee-payments/page.tsx','utf8').includes("redirect('/dashboard/payments')"));
 const files=fs.readdirSync('components/employee-payments').filter(f=>/tsx$/.test(f)).map(f=>fs.readFileSync('components/employee-payments/'+f,'utf8')).join('');for(const forbidden of ['40%','FinalNet','/api/employees','canLink','employeeClosing'])assert.equal(files.includes(forbidden),false,forbidden);
});

test('admission dates may precede 2000 while competence still starts at 2000',()=>{assert.equal(m.employeePersonForm({name:'Employee',monthlyValue:'2000',admissionDate:'1990-01-01'},true).get('AdmissionDate'),'1990-01-01');assert.throws(()=>m.employeeDate('2026-02-30'));assert.throws(()=>m.employeePeriod(1999,1,1));});
