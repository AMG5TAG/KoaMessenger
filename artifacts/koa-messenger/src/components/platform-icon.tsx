import React from "react";
import {
  SiWhatsapp, SiTelegram, SiDiscord, SiSlack,
  SiSignal, SiWechat, SiLine, SiKakaotalk,
  SiTwitch, SiInstagram, SiSnapchat,
  SiReddit, SiPinterest, SiTiktok, SiYoutube,
  SiGithub, SiGitlab, SiNotion, SiTrello,
  SiJira, SiZoom, SiGooglemeet, SiMessenger,
  SiFacebook, SiX, SiBluesky, SiGmail,
  SiProtonmail, SiBasecamp, SiMattermost,
  SiRocketdotchat, SiZulip, SiGitter, SiElement,
  SiMatrix, SiSteam, SiVk, SiJitsi,
  SiMastodon, SiThreads, SiXing, SiApple,
  SiGoogle, SiWebex, SiImessage, SiThreema,
  SiWire, SiKeybase, SiIcq,
  SiGroupme, SiPushbullet, SiCircle, SiTuta,
  SiWorkplace,
} from "react-icons/si";
import {
  FaFacebook, FaFacebookMessenger, FaSkype, FaViber,
  FaTwitter, FaQq, FaWeixin, FaLinkedin,
  FaLine, FaDiscord, FaMicrosoft, FaApple,
  FaYahoo, FaGoogle, FaEnvelope, FaEnvelopeOpen,
  FaComment, FaComments, FaPhone, FaVideo,
  FaShieldAlt, FaUsers, FaCommentDots,
  FaCommentAlt, FaSms, FaPaperPlane, FaInternetExplorer,
} from "react-icons/fa";
import {
  BsEnvelopeFill, BsEnvelopeOpenFill, BsChatDotsFill,
  BsChatLeftTextFill, BsPeopleFill, BsPhoneFill,
  BsChatHeartFill, BsShieldFill, BsCameraVideoFill,
  BsChatSquareFill, BsMicrosoftTeams,
} from "react-icons/bs";
import {
  IoMail, IoMailOpen, IoMailUnread, IoCall,
  IoVideocam, IoChatbubble, IoChatbubbles,
  IoLogoMicrosoft,
} from "react-icons/io5";
import {
  FcGoogle, FcPhone, FcCollaboration, FcTreeStructure,
  FcFolder,
} from "react-icons/fc";

type Platform = {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
};

type PlatformIconProps =
  | { platform: Platform; size?: "sm" | "md" | "lg"; className?: string }
  | { name: string; color?: string; iconUrl?: string | null; className?: string; size?: "sm" | "md" | "lg" };

/**
 * Full icon map for all 64+ platforms across react-icons libraries.
 * Key order matters: more specific keys (e.g. "facebook messenger") before
 * generic ones ("facebook") so the longer match wins.
 */
const ICON_MAP: Record<string, React.ReactNode> = {
  /* ── messaging (most popular) ── */
  whatsapp: <SiWhatsapp className="w-full h-full" />,
  "facebook messenger": <SiMessenger className="w-full h-full" />,
  messenger: <SiMessenger className="w-full h-full" />,
  telegram: <SiTelegram className="w-full h-full" />,
  discord: <SiDiscord className="w-full h-full" />,
  slack: <SiSlack className="w-full h-full" />,
  signal: <SiSignal className="w-full h-full" />,
  "microsoft teams": <BsMicrosoftTeams className="w-full h-full" />,
  teams: <BsMicrosoftTeams className="w-full h-full" />,
  "google chat": <SiGoogle className="w-full h-full" />,
  wechat: <SiWechat className="w-full h-full" />,
  weixin: <SiWechat className="w-full h-full" />,
  skype: <FaSkype className="w-full h-full" />,
  viber: <FaViber className="w-full h-full" />,
  line: <SiLine className="w-full h-full" />,
  kakao: <SiKakaotalk className="w-full h-full" />,
  "kakaotalk": <SiKakaotalk className="w-full h-full" />,
  qq: <FaQq className="w-full h-full" />,
  zoom: <SiZoom className="w-full h-full" />,
  "google meet": <SiGooglemeet className="w-full h-full" />,
  meet: <SiGooglemeet className="w-full h-full" />,

  /* ── social ── */
  "instagram dms": <SiInstagram className="w-full h-full" />,
  instagram: <SiInstagram className="w-full h-full" />,
  twitter: <SiX className="w-full h-full" />,
  "twitter / x": <SiX className="w-full h-full" />,
  x: <SiX className="w-full h-full" />,
  threads: <SiThreads className="w-full h-full" />,
  snapchat: <SiSnapchat className="w-full h-full" />,
  reddit: <SiReddit className="w-full h-full" />,
  "reddit chat": <SiReddit className="w-full h-full" />,
  linkedin: <FaLinkedin className="w-full h-full" />,
  twitch: <SiTwitch className="w-full h-full" />,
  "twitch chat": <SiTwitch className="w-full h-full" />,
  youtube: <SiYoutube className="w-full h-full" />,
  pinterest: <SiPinterest className="w-full h-full" />,
  tiktok: <SiTiktok className="w-full h-full" />,
  mastodon: <SiMastodon className="w-full h-full" />,
  bluesky: <SiBluesky className="w-full h-full" />,
  "workplace by meta": <SiWorkplace className="w-full h-full" />,
  workplace: <SiWorkplace className="w-full h-full" />,
  vk: <SiVk className="w-full h-full" />,

  /* ── email ── */
  gmail: <SiGmail className="w-full h-full" />,
  protonmail: <SiProtonmail className="w-full h-full" />,
  outlook: <FaEnvelopeOpen className="w-full h-full" />,
  fastmail: <BsEnvelopeFill className="w-full h-full" />,
  "tuta mail": <SiTuta className="w-full h-full" />,
  tuta: <SiTuta className="w-full h-full" />,
  "yahoo mail": <FaYahoo className="w-full h-full" />,
  yahoo: <FaYahoo className="w-full h-full" />,

  /* ── productivity / work ── */
  notion: <SiNotion className="w-full h-full" />,
  github: <SiGithub className="w-full h-full" />,
  gitlab: <SiGitlab className="w-full h-full" />,
  trello: <SiTrello className="w-full h-full" />,
  jira: <SiJira className="w-full h-full" />,
  basecamp: <SiBasecamp className="w-full h-full" />,
  twist: <FaPaperPlane className="w-full h-full" />,
  "cisco webex": <SiWebex className="w-full h-full" />,
  webex: <SiWebex className="w-full h-full" />,
  "jitsi meet": <SiJitsi className="w-full h-full" />,
  jitsi: <SiJitsi className="w-full h-full" />,
  whereby: <FaVideo className="w-full h-full" />,

  /* ── open / secure / niche ── */
  element: <SiElement className="w-full h-full" />,
  "element (matrix)": <SiElement className="w-full h-full" />,
  matrix: <SiMatrix className="w-full h-full" />,
  mattermost: <SiMattermost className="w-full h-full" />,
  "rocket.chat": <SiRocketdotchat className="w-full h-full" />,
  zulip: <SiZulip className="w-full h-full" />,
  gitter: <SiGitter className="w-full h-full" />,
  threema: <SiThreema className="w-full h-full" />,
  wire: <SiWire className="w-full h-full" />,
  keybase: <SiKeybase className="w-full h-full" />,
  session: <FaShieldAlt className="w-full h-full" />,
  status: <FaShieldAlt className="w-full h-full" />,
  briar: <FaShieldAlt className="w-full h-full" />,
  tox: <FaCommentAlt className="w-full h-full" />,
  jami: <FaPhone className="w-full h-full" />,

  /* ── misc / lesser known ── */
  dingtalk: <BsChatSquareFill className="w-full h-full" />,
  "google voice": <FcPhone className="w-full h-full" />,
  groupme: <SiGroupme className="w-full h-full" />,
  icq: <SiIcq className="w-full h-full" />,
  "steam chat": <SiSteam className="w-full h-full" />,
  steam: <SiSteam className="w-full h-full" />,
  icloud: <SiApple className="w-full h-full" />,
  "imessage (icloud)": <SiImessage className="w-full h-full" />,
  imessage: <SiImessage className="w-full h-full" />,
  pushbullet: <SiPushbullet className="w-full h-full" />,
  circle: <SiCircle className="w-full h-full" />,
  flock: <BsPeopleFill className="w-full h-full" />,
  flowdock: <BsChatLeftTextFill className="w-full h-full" />,
  geneva: <BsChatDotsFill className="w-full h-full" />,
  chanty: <FaCommentDots className="w-full h-full" />,
  xing: <SiXing className="w-full h-full" />,

  /* ── loose fallbacks ── */
  facebook: <SiFacebook className="w-full h-full" />,
  google: <SiGoogle className="w-full h-full" />,
  apple: <SiApple className="w-full h-full" />,
  microsoft: <FaMicrosoft className="w-full h-full" />,
  cisco: <FaInternetExplorer className="w-full h-full" />,
};

const SIZE_MAP = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-14 h-14",
};

/* ── luminance helper for light-coloured platform backgrounds ── */
function isLightBg(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 190;
}

export function PlatformIcon(props: PlatformIconProps) {
  let name: string;
  let color: string;
  let iconUrl: string | null | undefined;
  let size: "sm" | "md" | "lg" | undefined;
  let className: string;

  if ("platform" in props) {
    name = props.platform.name;
    color = props.platform.color ?? "#dc2350";
    iconUrl = props.platform.iconUrl;
    size = props.size;
    className = props.className ?? "";
  } else {
    name = props.name;
    color = props.color ?? "#dc2350";
    iconUrl = props.iconUrl;
    size = props.size;
    className = props.className ?? "";
  }

  const normalizedName = name.toLowerCase();
  const icon = Object.entries(ICON_MAP).find(([key]) =>
    normalizedName.includes(key)
  )?.[1];

  const sizeClass = size ? SIZE_MAP[size] : "";
  const combinedClass = [sizeClass, className].filter(Boolean).join(" ");

  const textColor = isLightBg(color) ? "#111" : "#fff";

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
      style={{ backgroundColor: color, color: textColor }}
    >
      {icon ? (
        <div className="w-3/5 h-3/5">{icon}</div>
      ) : (
        <span className="font-bold text-lg">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
