const express = require("express");
const router = express.Router();

// Placeholder voice route (AI integration baad mein karenge)
router.post("/chat", async (req, res) => {
  res.json({
    text: "Voice feature coming soon!",
    toolCalled: null,
    toolResult: null,
  });
});

router.get("/greeting", (req, res) => {
  res.json({
    text: "Assalam-o-Alaikum! Voice feature coming soon.",
  });
});

module.exports = router;