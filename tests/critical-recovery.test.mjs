import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const src = readFileSync('components/login/lock_shell.qml', 'utf8')
function body(marker) {
 const a = src.indexOf('{', src.indexOf(marker)); let depth = 1, i = a + 1
 for (; depth; i++) { if (src[i] === '{') depth++; if (src[i] === '}') depth-- }
 return src.slice(a + 1, i - 1)
}
function fixture() {
 const sent = [], root = { authenticated:false, currentUser:'owner', emergencyMode:false, loginFail(){this.failed=true} }
 const pam = {active:false, pendingPassword:'', hasPendingPassword:false, start(){return true}, respond(value){sent.push(value)}}
 return { ctx:vm.createContext({shellRoot:root,currentUser:'owner',pam,user:'someone-else',pass:''}),root,pam,sent }
}
test('authentication always targets owner; empty passwords are sent once', () => {
 const f=fixture(); vm.runInContext('(function(){' + body('function doAuth') + '})()',f.ctx)
 assert.equal(f.pam.user,'owner'); assert.equal(f.pam.hasPendingPassword,true)
 f.pam.responseRequired=true
 // Signal handler properties are scoped to PamContext in QML.
 Object.assign(f.ctx,{responseRequired:true,responseVisible:false,hasPendingPassword:true,pendingPassword:'',respond:f.pam.respond})
 vm.runInContext('(function(){' + body('onResponseRequiredChanged:') + '})()',f.ctx)
 assert.deepEqual(f.sent,['']); assert.equal(f.ctx.hasPendingPassword,false)
})
test('failed PAM start clears secrets and reports failure', () => {
 const f=fixture(); f.ctx.pass='secret'; f.pam.start=()=>false
 vm.runInContext('(function(){' + body('function doAuth') + '})()',f.ctx)
 assert.equal(f.pam.pendingPassword,''); assert.equal(f.root.failed,true)
})
test('a second secret prompt enables emergency entry', () => {
 const f=fixture()
 Object.assign(f.ctx,{responseRequired:true,responseVisible:false,hasPendingPassword:false})
 vm.runInContext('(function(){' + body('onResponseRequiredChanged:') + '})()',f.ctx)
 assert.equal(f.root.emergencyMode,true)
 f.pam.active=true; f.pam.responseRequired=true; f.ctx.pass='123456'
 vm.runInContext('(function(){' + body('function doAuth') + '})()',f.ctx)
 assert.deepEqual(f.sent,['123456'])
})
