import { MULTI_ENDPOINT_PROVIDERS, PROVIDER_TO_ENDPOINT_TYPE } from "./constants";

export interface EndpointPayload {
  endpoint_type: string;
  endpoint_variant: string;
  path: string;
  is_default: boolean;
}

export const isMultiEndpointProvider = (provider: string) => {
  return MULTI_ENDPOINT_PROVIDERS.has(provider);
};

export const buildEndpoints = (provider: string, variant: string): EndpointPayload[] => {
  if (provider === "OpenAI" && !variant) {
    return [
      {
        endpoint_type: "openai",
        endpoint_variant: "chat_completions",
        path: "",
        is_default: true,
      },
      {
        endpoint_type: "openai",
        endpoint_variant: "responses",
        path: "",
        is_default: false,
      },
    ];
  }

  if (isMultiEndpointProvider(provider)) {
    const isOneApi = provider === "OneAPI";
    return [
      {
        endpoint_type: "openai",
        endpoint_variant: "chat_completions",
        path: "",
        is_default: true,
      },
      {
        endpoint_type: "openai",
        endpoint_variant: "responses",
        path: "",
        is_default: false,
      },
      {
        endpoint_type: "google",
        endpoint_variant: "generate",
        path: isOneApi ? "gemini/" : "",
        is_default: false,
      },
      {
        endpoint_type: "anthropic",
        endpoint_variant: "messages",
        path: isOneApi ? "claude/" : "",
        is_default: false,
      },
    ];
  }

  const endpointType = PROVIDER_TO_ENDPOINT_TYPE[provider] || "openai";
  const endpointVariant = variant || "chat_completions";
  return [
    {
      endpoint_type: endpointType,
      endpoint_variant: endpointVariant,
      path: "",
      is_default: true,
    },
  ];
};
