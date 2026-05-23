import React from 'react';
import {
  SiWhatsapp, SiTelegram, SiDiscord, SiSlack,
  SiSignal, SiWechat, SiLine, SiKakaotalk,
  SiTwitch, SiInstagram, SiSnapchat,
  SiReddit, SiPinterest, SiTiktok, SiYoutube,
  SiGithub, SiGitlab, SiNotion, SiTrello,
  SiJira, SiZoom, SiGooglemeet, SiMessenger,
} from 'react-icons/si';
import {
  FaFacebook, FaFacebookMessenger, FaSkype, FaViber,
  FaTwitter, FaQq, FaWeixin, FaLinkedin,
  FaLine, FaDiscord,
} from 'react-icons/fa';

type Platform = {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
};

type PlatformIconProps =
  | { platform: Platform; size?: 'sm' | 'md' | 'lg'; className?: string }
  | { name: string; color?: string; iconUrl?: string | null; className?: string; size?: 'sm' | 'md' | 'lg' };

const ICON_MAP: Record<string, React.ReactNode> = {
  whatsapp: <SiWhatsapp className="w-full h-full" />,
  telegram: <SiTelegram className="w-full h-full" />,
  discord: <SiDiscord className="w-full h-full" />,
  slack: <SiSlack className="w-full h-full" />,
  signal: <SiSignal className="w-full h-full" />,
  wechat: <SiWechat className="w-full h-full" />,
  weixin: <FaWeixin className="w-full h-full" />,
  skype: <FaSkype className="w-full h-full" />,
  viber: <FaViber className="w-full h-full" />,
  facebook: <FaFacebook className="w-full h-full" />,
  messenger: <SiMessenger className="w-full h-full" />,
  twitter: <FaTwitter className="w-full h-full" />,
  line: <SiLine className="w-full h-full" />,
  kakao: <SiKakaotalk className="w-full h-full" />,
  twitch: <SiTwitch className="w-full h-full" />,
  linkedin: <FaLinkedin className="w-full h-full" />,
  instagram: <SiInstagram className="w-full h-full" />,
  snapchat: <SiSnapchat className="w-full h-full" />,
  reddit: <SiReddit className="w-full h-full" />,
  pinterest: <SiPinterest className="w-full h-full" />,
  tiktok: <SiTiktok className="w-full h-full" />,
  youtube: <SiYoutube className="w-full h-full" />,
  github: <SiGithub className="w-full h-full" />,
  gitlab: <SiGitlab className="w-full h-full" />,
  notion: <SiNotion className="w-full h-full" />,
  trello: <SiTrello className="w-full h-full" />,
  jira: <SiJira className="w-full h-full" />,
  zoom: <SiZoom className="w-full h-full" />,
  'google meet': <SiGooglemeet className="w-full h-full" />,
  meet: <SiGooglemeet className="w-full h-full" />,
  qq: <FaQq className="w-full h-full" />,
};

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

export function PlatformIcon(props: PlatformIconProps) {
  let name: string;
  let color: string;
  let iconUrl: string | null | undefined;
  let size: 'sm' | 'md' | 'lg' | undefined;
  let className: string;

  if ('platform' in props) {
    name = props.platform.name;
    color = props.platform.color ?? '#dc2350';
    iconUrl = props.platform.iconUrl;
    size = props.size;
    className = props.className ?? '';
  } else {
    name = props.name;
    color = props.color ?? '#dc2350';
    iconUrl = props.iconUrl;
    size = props.size;
    className = props.className ?? '';
  }

  const normalizedName = name.toLowerCase();
  const icon = Object.entries(ICON_MAP).find(([key]) => normalizedName.includes(key))?.[1];

  const sizeClass = size ? SIZE_MAP[size] : '';
  const combinedClass = [sizeClass, className].filter(Boolean).join(' ');

  if (iconUrl) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl overflow-hidden ${combinedClass}`}
        style={{ backgroundColor: color }}
      >
        <img src={iconUrl} alt={name} className="w-3/5 h-3/5 object-contain" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-xl overflow-hidden ${combinedClass}`}
      style={{ backgroundColor: color, color: '#fff' }}
    >
      {icon ? (
        <div className="w-3/5 h-3/5">{icon}</div>
      ) : (
        <span className="font-bold text-lg">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
