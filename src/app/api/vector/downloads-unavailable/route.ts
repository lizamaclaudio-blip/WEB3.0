export async function GET(){return Response.json({ok:false,code:'DOWNLOADS_NOT_OPEN'},{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});}
