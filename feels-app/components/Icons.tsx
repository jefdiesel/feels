import { View, Text, StyleSheet } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface IconProps {
  size?: number;
  color?: string;
}

// Modern Feather-style icons using @expo/vector-icons
// These are clean, minimal line icons that match modern app design

export function FlameIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="flame-outline" size={size} color={color} />;
}

export function FlameFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="flame" size={size} color={color} />;
}

export function MessageIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="message-circle" size={size} color={color} />;
}

export function MessageFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="chatbubble" size={size} color={color} />;
}

export function UserIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="user" size={size} color={color} />;
}

export function UserFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="person" size={size} color={color} />;
}

export function HeartIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="heart" size={size} color={color} />;
}

export function HeartFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="heart" size={size} color={color} />;
}

export function XIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="x" size={size} color={color} />;
}

export function StarIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="star" size={size} color={color} />;
}

export function StarFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="star" size={size} color={color} />;
}

export function SettingsIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="settings" size={size} color={color} />;
}

export function SearchIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="search" size={size} color={color} />;
}

export function BellIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="bell" size={size} color={color} />;
}

export function LockIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="lock" size={size} color={color} />;
}

export function UnlockIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="unlock" size={size} color={color} />;
}

export function ShieldIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="shield" size={size} color={color} />;
}

export function CrownIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <MaterialCommunityIcons name="crown-outline" size={size} color={color} />;
}

export function HelpCircleIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="help-circle" size={size} color={color} />;
}

export function LogOutIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="log-out" size={size} color={color} />;
}

export function ChevronRightIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="chevron-right" size={size} color={color} />;
}

export function ChevronLeftIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="chevron-left" size={size} color={color} />;
}

export function ChevronUpIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="chevron-up" size={size} color={color} />;
}

export function ChevronDownIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="chevron-down" size={size} color={color} />;
}

export function PlusIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="plus" size={size} color={color} />;
}

export function MinusIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="minus" size={size} color={color} />;
}

export function CameraIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="camera" size={size} color={color} />;
}

export function ImageIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="image" size={size} color={color} />;
}

export function SendIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="send" size={size} color={color} />;
}

export function SparklesIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <MaterialCommunityIcons name="shimmer" size={size} color={color} />;
}

export function CoinIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <MaterialCommunityIcons name="circle-multiple-outline" size={size} color={color} />;
}

export function ZapIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="zap" size={size} color={color} />;
}

export function ZapFilledIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="flash" size={size} color={color} />;
}

export function EditIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="edit-2" size={size} color={color} />;
}

export function MapPinIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="map-pin" size={size} color={color} />;
}

export function SlidersIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="sliders" size={size} color={color} />;
}

export function CheckIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="check" size={size} color={color} />;
}

export function CheckCheckIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Ionicons name="checkmark-done" size={size} color={color} />;
}

export function CheckCircleIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="check-circle" size={size} color={color} />;
}

export function PartyPopperIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <MaterialCommunityIcons name="party-popper" size={size} color={color} />;
}

export function EyeIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="eye" size={size} color={color} />;
}

export function EyeOffIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="eye-off" size={size} color={color} />;
}

export function ArrowLeftIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="arrow-left" size={size} color={color} />;
}

export function ArrowRightIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="arrow-right" size={size} color={color} />;
}

export function RefreshIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="refresh-cw" size={size} color={color} />;
}

export function AlertCircleIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="alert-circle" size={size} color={color} />;
}

export function InfoIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="info" size={size} color={color} />;
}

export function MoreHorizontalIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="more-horizontal" size={size} color={color} />;
}

export function MoreVerticalIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="more-vertical" size={size} color={color} />;
}

export function GridIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="grid" size={size} color={color} />;
}

export function SparkleIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <MaterialCommunityIcons name="star-four-points" size={size} color={color} />;
}

export function TargetIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="target" size={size} color={color} />;
}

export function TrendingUpIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="trending-up" size={size} color={color} />;
}

export function GiftIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="gift" size={size} color={color} />;
}

export function AwardIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="award" size={size} color={color} />;
}

export function TrashIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="trash-2" size={size} color={color} />;
}

export function FlagIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="flag" size={size} color={color} />;
}

export function SlashIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="slash" size={size} color={color} />;
}

export function UserXIcon({ size = 24, color = '#FFFFFF' }: IconProps) {
  return <Feather name="user-x" size={size} color={color} />;
}
