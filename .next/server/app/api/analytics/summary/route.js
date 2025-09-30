(()=>{var e={};e.id=847,e.ids=[847],e.modules={846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},4870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},3033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},9428:e=>{"use strict";e.exports=require("buffer")},5511:e=>{"use strict";e.exports=require("crypto")},4735:e=>{"use strict";e.exports=require("events")},9021:e=>{"use strict";e.exports=require("fs")},1630:e=>{"use strict";e.exports=require("http")},5591:e=>{"use strict";e.exports=require("https")},1645:e=>{"use strict";e.exports=require("net")},1820:e=>{"use strict";e.exports=require("os")},3873:e=>{"use strict";e.exports=require("path")},7910:e=>{"use strict";e.exports=require("stream")},4631:e=>{"use strict";e.exports=require("tls")},9551:e=>{"use strict";e.exports=require("url")},8354:e=>{"use strict";e.exports=require("util")},4075:e=>{"use strict";e.exports=require("zlib")},7598:e=>{"use strict";e.exports=require("node:crypto")},7990:()=>{},820:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>m,routeModule:()=>l,serverHooks:()=>R,workAsyncStorage:()=>d,workUnitAsyncStorage:()=>x});var s={};r.r(s),r.d(s,{GET:()=>p});var a=r(2706),o=r(8203),u=r(5994),i=r(9187),n=r(2545),c=r(5369);async function p(e){let t=c.j.getUserFromRequest(e);if(!t)return i.NextResponse.json({error:"未授權"},{status:401});let{searchParams:r}=new URL(e.url),s=r.get("month")||new Date().getMonth()+1,a=r.get("year")||new Date().getFullYear();try{let e=`analytics:${t.userId}:${a}-${s}`,r=await n.db.cache.get(e);if(r)return i.NextResponse.json(r);let o=await n.db.query`
      SELECT COALESCE(SUM(amount), 0) as total_expense
      FROM transactions 
      WHERE user_id = ${t.userId} 
        AND type = 'expense'
        AND EXTRACT(MONTH FROM date) = ${s}
        AND EXTRACT(YEAR FROM date) = ${a}
    `,u=await n.db.query`
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM transactions 
      WHERE user_id = ${t.userId} 
        AND type = 'income'
        AND EXTRACT(MONTH FROM date) = ${s}
        AND EXTRACT(YEAR FROM date) = ${a}
    `,c=await n.db.query`
      SELECT category, SUM(amount) as amount, COUNT(*) as count
      FROM transactions 
      WHERE user_id = ${t.userId} 
        AND type = 'expense'
        AND EXTRACT(MONTH FROM date) = ${s}
        AND EXTRACT(YEAR FROM date) = ${a}
      GROUP BY category
      ORDER BY amount DESC
    `,p=await n.db.query`
      SELECT name, balance, type
      FROM accounts 
      WHERE user_id = ${t.userId} AND is_active = true
      ORDER BY balance DESC
    `,l={total_expense:parseFloat(o.rows[0].total_expense),total_income:parseFloat(u.rows[0].total_income),net_income:parseFloat(u.rows[0].total_income)-parseFloat(o.rows[0].total_expense),categories:c.rows,accounts:p.rows};return await n.db.cache.set(e,l,{ex:3600}),i.NextResponse.json(l)}catch(e){return i.NextResponse.json({error:"取得統計失敗"},{status:500})}}let l=new a.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/analytics/summary/route",pathname:"/api/analytics/summary",filename:"route",bundlePath:"app/api/analytics/summary/route"},resolvedPagePath:"/mnt/c/Users/xiaoheji/OneDrive - International Games System/文件/GitHub/Accounting/app/api/analytics/summary/route.ts",nextConfigOutput:"",userland:s}),{workAsyncStorage:d,workUnitAsyncStorage:x,serverHooks:R}=l;function m(){return(0,u.patchFetch)({workAsyncStorage:d,workUnitAsyncStorage:x})}},6487:()=>{},8335:()=>{},5369:(e,t,r)=>{"use strict";r.d(t,{j:()=>n});var s=r(3008),a=r.n(s),o=r(8964),u=r.n(o);let i=process.env.JWT_SECRET||"your-secret-key",n={hashPassword:e=>u().hash(e,12),verifyPassword:(e,t)=>u().compare(e,t),generateToken:e=>a().sign({userId:e},i,{expiresIn:"7d"}),verifyToken:e=>{try{return a().verify(e,i)}catch{return null}},getUserFromRequest:e=>{let t=e.headers.get("authorization")?.replace("Bearer ","");return t?n.verifyToken(t):null}}},2545:(e,t,r)=>{"use strict";r.d(t,{db:()=>o});var s=r(6875),a=r(3636);let o={query:s.ll,cache:a.kv}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[989,297],()=>r(820));module.exports=s})();