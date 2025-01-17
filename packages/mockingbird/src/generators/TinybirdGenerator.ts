import fetch from "cross-fetch";
import { z } from "zod";

import { baseConfigSchema, Row } from "../types";
import BaseGenerator from "./BaseGenerator";

const tinybirdConfigSchema = baseConfigSchema.merge(
  z.object({
    endpoint: z.string(),
    datasource: z.string(),
    token: z.string(),
  })
);

export type TinybirdConfig = z.infer<typeof tinybirdConfigSchema>;

export default class TinybirdGenerator extends BaseGenerator<TinybirdConfig> {
  readonly config: TinybirdConfig;

  readonly endpoints = {
    eu_gcp: "https://api.tinybird.co",
    us_gcp: "https://api.us-east.tinybird.co",
  } as const;

  readonly events_path = "/v0/events" as const;

  constructor(config: TinybirdConfig) {
    super();

    this.config = tinybirdConfigSchema.parse(config);
  }

  async sendData(rows: Row[]): Promise<void> {
    const params = { name: this.config.datasource, from: "mockingbird" };
    const endpointURL =
      this.config.endpoint in this.endpoints
        ? this.endpoints[this.config.endpoint as keyof typeof this.endpoints]
        : this.config.endpoint;
    const url = new URL(`${endpointURL}${this.events_path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
      },
      method: "POST",
      body: rows.map((d) => JSON.stringify(d)).join("\n"),
    })
      .then((res) => {
        const contentType = res.headers.get("Content-Type");
        if (contentType && contentType.toLowerCase().indexOf("text") > -1) {
          return res.text();
        }
        return res.json();
      })
      .then((res) => {
        this.log("info", `Tinybird Response: ${JSON.stringify(res)}`);
      })
      .catch((err) => {
        this.log("error", `Tinybird Error: ${JSON.stringify(err)}`);
      });
  }
}
