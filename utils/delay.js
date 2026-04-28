function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function simulateProcessingDelay() {
  const minDelay = 1000;
  const maxDelay = 2000;
  const delayMs =
    Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

  return delay(delayMs);
}

module.exports = {
  delay,
  simulateProcessingDelay,
};
