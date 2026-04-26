import SignupDisabled from "../_components/signup-disabled";
import { checkSignupAvailability } from "@/app/_actions/auth";
import Signup from "../_components/signup";


export const metadata = {
  title: "Sign Up - Tether-ERP",
  description: "Sign up to and create your account",
};

export default async function SignupPage() {
  const check = await checkSignupAvailability();

  if (!check?.data?.enabled) return <SignupDisabled />;

  return (
    <>
      <Signup />
    </>
  );
}
