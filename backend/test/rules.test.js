// test/rules.test.js
var RC=require("../rules/RuleCompiler");var RE=require("../rules/RuleEvaluator");var RS=require("../rules/RuleSandbox");
jest.mock("../rules/RuleRepository",function(){return{ensureTable:jest.fn().mockResolvedValue(),loadActiveRules:jest.fn().mockResolvedValue([]),invalidateCache:jest.fn(),createRule:jest.fn(),getRuleById:jest.fn(),getAllRules:jest.fn(),updateRule:jest.fn(),deleteRule:jest.fn()};});
var REng=require("../rules/RuleEngine");
describe("RC",function(){
test("null",function(){expect(function(){RC.compileCondition(null)}).toThrow()});
test("missing",function(){expect(function(){RC.compileCondition({operator:"eq",value:1})}).toThrow()});
test("gt",function(){var fn=RC.compileCondition({field:"a",operator:"gt",value:1000});expect(fn({a:1500})).toBe(true);expect(fn({a:500})).toBe(false)});
test("eq",function(){var fn=RC.compileCondition({field:"s",operator:"eq",value:"x"});expect(fn({s:"x"})).toBe(true);expect(fn({s:"y"})).toBe(false)});
test("contains",function(){var fn=RC.compileCondition({field:"e",operator:"contains",value:"@b"});expect(fn({e:"a@b.c"})).toBe(true);expect(fn({e:"a@c.c"})).toBe(false)});
test("in",function(){var fn=RC.compileCondition({field:"c",operator:"in",value:["A","B"]});expect(fn({c:"A"})).toBe(true);expect(fn({c:"C"})).toBe(false)});
test("nested",function(){var fn=RC.compileCondition({field:"tx.a",operator:"gte",value:50});expect(fn({tx:{a:100}})).toBe(true)});
});
describe("CR",function(){
test("all",function(){var c=RC.compileRule({name:"t",action:"W",conditions:{all:[{field:"a",operator:"gt",value:1000}]}});expect(c.evaluate({a:2000}).matched).toBe(true);expect(c.evaluate({a:500}).matched).toBe(false)});
test("any",function(){var c=RC.compileRule({name:"t",action:"W",conditions:{any:[{field:"x",operator:"eq",value:"a"},{field:"x",operator:"eq",value:"b"}]}});expect(c.evaluate({x:"a"}).matched).toBe(true);expect(c.evaluate({x:"c"}).matched).toBe(false)});
test("thresh",function(){var c=RC.compileRule({name:"t",action:"W",conditions:{all:[{field:"a",operator:"gt",value:0},{field:"b",operator:"gt",value:0},{field:"c",operator:"gt",value:0}]},threshold:0.66});expect(c.evaluate({a:1,b:1,c:0}).matched).toBe(true);expect(c.evaluate({a:1,b:0,c:0}).matched).toBe(false)});
});
describe("Val",function(){
test("valid",function(){expect(RC.validateRuleDefinition({name:"v",conditions:{all:[{field:"a",operator:"gt",value:1}]},action:"HIGH_RISK"}).valid).toBe(true)});
});
describe("REv",function(){
test("AND",function(){expect(RE.evaluateRuleConditions({all:[{field:"a",operator:"eq",value:1}]},{a:1}).matched).toBe(true)});
test("NOT",function(){expect(RE.evaluateCondition({not:{field:"f",operator:"eq",value:true}},{f:false}).passed).toBe(true)});
test("tw",function(){expect(RE.evaluateTimeWindow({field:"t",value:"5m"},{t:new Date(Date.now()-60000).toISOString()}).passed).toBe(true)});
test("rel",function(){expect(RE.evaluateRelationship({relationshipType:"sd"},{relationships:[{type:"sd",target_id:"u2",depth:1}]}).passed).toBe(true)});
test("vel",function(){var n=Date.now();var r=RE.evaluateVelocity({field:"ev",threshold:5,window:"1h"},{ev:[{timestamp:new Date(n-60000).toISOString()},{timestamp:new Date(n-120000).toISOString()}]});expect(r.passed).toBe(true);expect(r.count).toBe(2)});
test("conf",function(){expect(RE.evaluateConfidence({minScore:60},{confidence_score:75}).passed).toBe(true)});
});
describe("RS",function(){
test("invalid",function(){expect(RS.runSandbox({},{a:1}).valid).toBe(false)});
test("valid",function(){var r=RS.runSandbox({name:"t",conditions:{all:[{field:"a",operator:"gt",value:5}]},action:"W",priority:5},{a:10});expect(r.valid).toBe(true);expect(r.matched).toBe(true)});
test("batch",function(){var rs=[{name:"r1",conditions:{all:[{field:"a",operator:"eq",value:1}]},action:"W"},{name:"r2",conditions:{all:[{field:"a",operator:"eq",value:99}]},action:"B"}];var res=RS.runBatchSandbox(rs,{a:1});expect(res[0].matched).toBe(true);expect(res[1].matched).toBe(false)});
test("mock",function(){var d=RS.generateMockData();expect(d.transaction.amount).toBe(25000000);expect(d.relationships.length).toBe(2)});
});
describe("REng",function(){
beforeEach(function(){REng._initialized=false;REng._activeRules=[]});
test("init",async function(){await REng.initialize();expect(REng._initialized).toBe(true)});
test("noMatch",async function(){require("../rules/RuleRepository").loadActiveRules.mockResolvedValue([{id:"1",name:"t",enabled:true,priority:5,conditions:{all:[{field:"a",operator:"gt",value:1000}]},action:"B"}]);var r=await REng.evaluate({a:500});expect(r.triggered).toHaveLength(0)});
test("match",async function(){require("../rules/RuleRepository").loadActiveRules.mockResolvedValue([{id:"r1",name:"high",enabled:true,priority:10,conditions:{all:[{field:"a",operator:"gt",value:1000}]},action:"HIGH_RISK"}]);var r=await REng.evaluate({a:5000});expect(r.triggered).toHaveLength(1);expect(r.triggered[0].action).toBe("HIGH_RISK")});
test("single",function(){expect(REng.evaluateSingleRule({name:"t",conditions:{all:[{field:"s",operator:"gte",value:50}]},action:"W"},{s:75}).matched).toBe(true)});
});