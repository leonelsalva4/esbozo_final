import {readFileSync,writeFileSync} from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';
const root=new URL('../../',import.meta.url),test=process.argv.includes('--test');
const config=dotenv.parse(readFileSync(new URL(test?'data/testing/p00/backend.env':'backend/.env',root)));
const database=new URL(config.DATABASE_URL).pathname.slice(1);if(test&&!database.startsWith('esbozo_test_'))throw Error('Sólo copia de pruebas');
const pool=new pg.Pool({connectionString:config.DATABASE_URL});
const findings=[];let checked=0;
try{
 const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
 for(const {tablename}of tables){if(!/^[a-z_]+$/.test(tablename))throw Error('Identificador inesperado');
 const rows=(await pool.query(`SELECT row_to_json(t) AS value FROM "${tablename}" t`)).rows;
 for(let n=0;n<rows.length;n++){const row=rows[n].value;if(tablename==='provenance_resource'&&row.content){row.content=Buffer.from(row.content.slice(2),'hex').toString('utf8');}if(/stable[\s_-]*diffusion|sd[\s_-]?1[._]?5|controlnet/i.test(JSON.stringify(row)))findings.push({table:tablename,row:n});checked++;}}
 const columns=(await pool.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND (column_name ILIKE '%controlnet%' OR table_name='control_map' OR column_name='control_map_id')")).rows;
 const result={database,checkedRows:checked,findings,legacyColumns:columns,at:new Date().toISOString()};
 writeFileSync(new URL(`data/testing/importacion-final/active-pipeline-${test?'test':'primary'}.json`,root),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(findings.length||columns.length)process.exitCode=1;
}finally{await pool.end();}
