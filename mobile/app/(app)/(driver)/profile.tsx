import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getSession } from "../../../services/session";
import { ProfileSummaryCard } from "../../../components/common/ProfileSummaryCard";

export default function DriverProfileScreen() {
  const { authContext } = useAuth();
  const [name, setName] = useState("Motorista");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = await getSession();
      if (session?.userName) setName(session.userName);
      if (session?.userEmail) setEmail(session.userEmail);
    };

    load();
  }, []);

  return (
    <ProfileSummaryCard
      title="Perfil do motorista"
      name={name}
      email={email}
      onSignOut={() => authContext.signOut()}
    />
  );
}
