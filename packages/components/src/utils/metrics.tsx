import mixpanel, { Dict } from "mixpanel-browser";

export function track(event_name: string, properties?: Dict | undefined) {
  if (process.env.NODE_ENV === "production") {
    mixpanel.track(event_name, properties);
  } else {
    console.log(`${event_name} tracked`);
  }
}
