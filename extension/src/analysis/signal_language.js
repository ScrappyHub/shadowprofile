export function explainSignalLabel(key) {
  const labels = {
    cart: "The site reacted to shopping or cart activity.",
    checkout: "The site reacted to checkout-related behavior.",
    telemetry: "The site appears to measure interaction behavior.",
    beacon: "Lightweight background requests were detected.",
    tracking_pixel: "Tracking pixel requests were observed.",
    recommendation: "Recommendation or feed behavior was observed.",
    third_party: "Third-party request activity was observed."
  };

  return labels[key] || "A behavioral signal was observed.";
}
