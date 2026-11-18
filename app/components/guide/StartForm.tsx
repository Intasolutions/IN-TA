'use client';

import { useId, useState } from 'react';
import { useText } from '../../site/SiteContext';
import Icon from '../Icon';
import css from './guide.module.css';

// The start of the robot's chat: their name, and a phone number or an email. Kept in the chat (GuideChat.tsx), which
// saves it with the conversation for the team (Django: Contact > Robot chats). Never sent to the AI: he calls them by
// their first name all the same, filled in where the AI writes {name}.

export type Details = { name: string; phone: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StartForm({ onDone }: { onDone: (details: Details) => void }) {
  const t = useText();
  const id = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [problem, setProblem] = useState('');

  const submit = () => {
    const n = name.trim().replace(/\s+/g, ' ');
    const p = phone.trim();
    const e = email.trim();
    const goodPhone = p.replace(/\D/g, '').length >= 7;
    if (n.length < 2) { setProblem(t('guide_chat_details_need_name')); return; }
    if ((!goodPhone && !EMAIL.test(e)) || (e && !EMAIL.test(e)) || (p && !goodPhone)) { setProblem(t('guide_chat_details_need_contact')); return; }
    setProblem('');
    onDone({ name: n, phone: goodPhone ? p : '', email: e });
  };

  return (
    <form className={css.lead} onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <label htmlFor={`${id}-name`}>{t('guide_chat_details_name')}</label>
      <input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} autoFocus />
      <label htmlFor={`${id}-phone`}>{t('guide_chat_details_phone')}</label>
      <input id={`${id}-phone`} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" maxLength={32} />
      <label htmlFor={`${id}-email`}>{t('guide_chat_details_email')}</label>
      <input id={`${id}-email`} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" maxLength={254} />
      {problem && <p className={css.leadProblem} role="alert">{problem}</p>}
      <button type="submit">
        {t('guide_chat_start_send')}
        <Icon name="east" className="text-[15px]" />
      </button>
      <p className={css.leadNote}><Icon name="lock" className="text-[12px]" />{t('guide_chat_start_note')}</p>
    </form>
  );
}
