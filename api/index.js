// Minimal test to see if JavaScript serverless functions work
module.exports = (req, res) => {
  res.status(200).json({
    message: "Hello from Vercel!",
    path: req.url,
    method: req.method
  });
};
