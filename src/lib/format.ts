export function maskPhone(phone: string | null) {
  if (!phone) return "—";
  if (phone.length <= 4) return "••••";
  return `••• ••• ${phone.slice(-4)}`;
}

export function maskEmail(email: string | null) {
  if (!email) return "—";
  const [user, domain] = email.split("@");
  if (!domain) return "••••";
  const visible = user.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(user.length - 2, 2))}@${domain}`;
}
