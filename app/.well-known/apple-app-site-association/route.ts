export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [{
        appIDs: ["LG7W94ZD3B.com.wrelikbrands.kouchd"],
        components: [{ "/": "/invite/*", comment: "Open a one-time Kouchd invitation" }],
      }],
    },
  });
}
