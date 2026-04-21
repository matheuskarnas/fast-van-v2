import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/useAuth";
import { getSession } from "../../../services/session";
import { ProfileSummaryCard } from "../../../components/common/ProfileSummaryCard";

export default function PassengerProfileScreen() {
  const { authContext } = useAuth();
  const [name, setName] = useState("Passageiro");
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
      title="Perfil do passageiro"
      name={name}
      email={email}
      onSignOut={() => authContext.signOut()}
    />
  );
}
