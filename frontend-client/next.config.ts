import type { NextConfig } from "next";
import withFlowbiteReact from "flowbite-react/plugin/nextjs";

const nextConfig: NextConfig = {
  agentRules: false,
  reactStrictMode: true,
};

export default withFlowbiteReact(nextConfig);
