"use client";

import { useState } from "react";
import { ArchiveButton } from "./ArchiveButton";
import { ContactForm } from "./ContactForm";

type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
};

export function ContactRow({
  companyId,
  contact,
}: {
  companyId: string;
  contact: Contact;
}) {
  const [editing, setEditing] = useState(false);
  if (editing)
    return (
      <tr>
        <td colSpan={5}>
          <ContactForm
            companyId={companyId}
            contact={contact}
            onDone={() => setEditing(false)}
          />
        </td>
      </tr>
    );
  return (
    <tr>
      <td>{contact.name}</td>
      <td>{contact.role ?? "—"}</td>
      <td>{contact.email ?? "—"}</td>
      <td>{contact.phone ?? "—"}</td>
      <td className="actions">
        <button
          type="button"
          className="secondary"
          onClick={() => setEditing(true)}
        >
          Modifier
        </button>{" "}
        <ArchiveButton
          url={`/api/contacts/${contact.id}`}
          active={contact.active}
        />
      </td>
    </tr>
  );
}
