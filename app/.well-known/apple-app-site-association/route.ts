export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [{
        appIDs: ["L8R42BJ54K.com.wrelikbrands.kouchd"],
        components: [{ "/": "/invite/*", comment: "Open a one-time Kouchd invitation" }],
      }],
    },
  });
}
