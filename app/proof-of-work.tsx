import { Redirect } from "expo-router";

export default function ProofOfWorkRedirect() {
  return <Redirect href={"/projects" as never} />;
}
