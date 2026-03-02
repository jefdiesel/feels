import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { useCreditsStore } from '@/stores/creditsStore';
import { api, profileApi, referralApi } from '@/api/client';
import PremiumModal from '@/components/PremiumModal';
import PhotoGrid from '@/components/PhotoGrid';
import {
  SettingsIcon,
  UserIcon,
  EditIcon,
  MapPinIcon,
  CoinIcon,
  HeartFilledIcon,
  CrownIcon,
  SlidersIcon,
  BellIcon,
  ShieldIcon,
  HelpCircleIcon,
  LogOutIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  ShareIcon,
  GiftIcon,
  SparklesIcon,
} from '@/components/Icons';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

interface Photo {
  id: string;
  url: string;
  position: number;
}

interface ProfilePrompt {
  question: string;
  answer: string;
}

// NYC ZIP code to borough and neighborhoods mapping
const NYC_ZIP_DATA: Record<string, { borough: string; neighborhoods: string[] }> = {
  // Manhattan
  '10001': { borough: 'Manhattan', neighborhoods: ['Chelsea'] },
  '10002': { borough: 'Manhattan', neighborhoods: ['Lower East Side', 'Chinatown'] },
  '10003': { borough: 'Manhattan', neighborhoods: ['East Village', 'Greenwich Village'] },
  '10004': { borough: 'Manhattan', neighborhoods: ['Financial District'] },
  '10005': { borough: 'Manhattan', neighborhoods: ['Financial District'] },
  '10006': { borough: 'Manhattan', neighborhoods: ['Financial District'] },
  '10007': { borough: 'Manhattan', neighborhoods: ['TriBeCa', 'Civic Center'] },
  '10009': { borough: 'Manhattan', neighborhoods: ['East Village', 'Alphabet City'] },
  '10010': { borough: 'Manhattan', neighborhoods: ['Gramercy', 'Flatiron'] },
  '10011': { borough: 'Manhattan', neighborhoods: ['Chelsea', 'West Village'] },
  '10012': { borough: 'Manhattan', neighborhoods: ['SoHo', 'NoHo', 'Greenwich Village'] },
  '10013': { borough: 'Manhattan', neighborhoods: ['TriBeCa', 'SoHo', 'Chinatown'] },
  '10014': { borough: 'Manhattan', neighborhoods: ['West Village', 'Greenwich Village'] },
  '10016': { borough: 'Manhattan', neighborhoods: ['Murray Hill', 'Kips Bay'] },
  '10017': { borough: 'Manhattan', neighborhoods: ['Midtown East', 'Turtle Bay'] },
  '10018': { borough: 'Manhattan', neighborhoods: ['Midtown', 'Garment District'] },
  '10019': { borough: 'Manhattan', neighborhoods: ['Midtown West', 'Hell\'s Kitchen'] },
  '10020': { borough: 'Manhattan', neighborhoods: ['Midtown', 'Rockefeller Center'] },
  '10021': { borough: 'Manhattan', neighborhoods: ['Upper East Side'] },
  '10022': { borough: 'Manhattan', neighborhoods: ['Midtown East', 'Sutton Place'] },
  '10023': { borough: 'Manhattan', neighborhoods: ['Upper West Side', 'Lincoln Square'] },
  '10024': { borough: 'Manhattan', neighborhoods: ['Upper West Side'] },
  '10025': { borough: 'Manhattan', neighborhoods: ['Upper West Side', 'Morningside Heights'] },
  '10026': { borough: 'Manhattan', neighborhoods: ['Harlem'] },
  '10027': { borough: 'Manhattan', neighborhoods: ['Harlem', 'Morningside Heights'] },
  '10028': { borough: 'Manhattan', neighborhoods: ['Upper East Side'] },
  '10029': { borough: 'Manhattan', neighborhoods: ['East Harlem'] },
  '10030': { borough: 'Manhattan', neighborhoods: ['Harlem'] },
  '10031': { borough: 'Manhattan', neighborhoods: ['Hamilton Heights', 'Sugar Hill'] },
  '10032': { borough: 'Manhattan', neighborhoods: ['Washington Heights'] },
  '10033': { borough: 'Manhattan', neighborhoods: ['Washington Heights'] },
  '10034': { borough: 'Manhattan', neighborhoods: ['Inwood'] },
  '10035': { borough: 'Manhattan', neighborhoods: ['East Harlem'] },
  '10036': { borough: 'Manhattan', neighborhoods: ['Midtown', 'Times Square', 'Hell\'s Kitchen'] },
  '10037': { borough: 'Manhattan', neighborhoods: ['Harlem'] },
  '10038': { borough: 'Manhattan', neighborhoods: ['Financial District', 'Seaport'] },
  '10039': { borough: 'Manhattan', neighborhoods: ['Harlem'] },
  '10040': { borough: 'Manhattan', neighborhoods: ['Washington Heights', 'Fort George'] },
  '10044': { borough: 'Manhattan', neighborhoods: ['Roosevelt Island'] },
  '10065': { borough: 'Manhattan', neighborhoods: ['Upper East Side', 'Lenox Hill'] },
  '10069': { borough: 'Manhattan', neighborhoods: ['Upper West Side'] },
  '10075': { borough: 'Manhattan', neighborhoods: ['Upper East Side'] },
  '10128': { borough: 'Manhattan', neighborhoods: ['Upper East Side', 'Yorkville'] },
  '10280': { borough: 'Manhattan', neighborhoods: ['Battery Park City'] },
  '10282': { borough: 'Manhattan', neighborhoods: ['Battery Park City'] },
  // Brooklyn
  '11201': { borough: 'Brooklyn', neighborhoods: ['Brooklyn Heights', 'DUMBO'] },
  '11203': { borough: 'Brooklyn', neighborhoods: ['East Flatbush'] },
  '11204': { borough: 'Brooklyn', neighborhoods: ['Bensonhurst'] },
  '11205': { borough: 'Brooklyn', neighborhoods: ['Fort Greene', 'Clinton Hill'] },
  '11206': { borough: 'Brooklyn', neighborhoods: ['Williamsburg', 'Bedford-Stuyvesant'] },
  '11207': { borough: 'Brooklyn', neighborhoods: ['East New York'] },
  '11208': { borough: 'Brooklyn', neighborhoods: ['East New York'] },
  '11209': { borough: 'Brooklyn', neighborhoods: ['Bay Ridge'] },
  '11210': { borough: 'Brooklyn', neighborhoods: ['Flatbush', 'Midwood'] },
  '11211': { borough: 'Brooklyn', neighborhoods: ['Williamsburg'] },
  '11212': { borough: 'Brooklyn', neighborhoods: ['Brownsville'] },
  '11213': { borough: 'Brooklyn', neighborhoods: ['Crown Heights'] },
  '11214': { borough: 'Brooklyn', neighborhoods: ['Bensonhurst', 'Bath Beach'] },
  '11215': { borough: 'Brooklyn', neighborhoods: ['Park Slope', 'Windsor Terrace'] },
  '11216': { borough: 'Brooklyn', neighborhoods: ['Bedford-Stuyvesant'] },
  '11217': { borough: 'Brooklyn', neighborhoods: ['Boerum Hill', 'Park Slope'] },
  '11218': { borough: 'Brooklyn', neighborhoods: ['Kensington', 'Windsor Terrace'] },
  '11219': { borough: 'Brooklyn', neighborhoods: ['Borough Park'] },
  '11220': { borough: 'Brooklyn', neighborhoods: ['Sunset Park'] },
  '11221': { borough: 'Brooklyn', neighborhoods: ['Bushwick', 'Bedford-Stuyvesant'] },
  '11222': { borough: 'Brooklyn', neighborhoods: ['Greenpoint'] },
  '11223': { borough: 'Brooklyn', neighborhoods: ['Gravesend'] },
  '11224': { borough: 'Brooklyn', neighborhoods: ['Coney Island', 'Brighton Beach'] },
  '11225': { borough: 'Brooklyn', neighborhoods: ['Crown Heights', 'Prospect Lefferts Gardens'] },
  '11226': { borough: 'Brooklyn', neighborhoods: ['Flatbush'] },
  '11228': { borough: 'Brooklyn', neighborhoods: ['Dyker Heights'] },
  '11229': { borough: 'Brooklyn', neighborhoods: ['Sheepshead Bay', 'Gerritsen Beach'] },
  '11230': { borough: 'Brooklyn', neighborhoods: ['Midwood'] },
  '11231': { borough: 'Brooklyn', neighborhoods: ['Carroll Gardens', 'Red Hook', 'Cobble Hill'] },
  '11232': { borough: 'Brooklyn', neighborhoods: ['Sunset Park', 'Greenwood'] },
  '11233': { borough: 'Brooklyn', neighborhoods: ['Bedford-Stuyvesant', 'Ocean Hill'] },
  '11234': { borough: 'Brooklyn', neighborhoods: ['Canarsie', 'Flatlands'] },
  '11235': { borough: 'Brooklyn', neighborhoods: ['Sheepshead Bay', 'Brighton Beach'] },
  '11236': { borough: 'Brooklyn', neighborhoods: ['Canarsie'] },
  '11237': { borough: 'Brooklyn', neighborhoods: ['Bushwick'] },
  '11238': { borough: 'Brooklyn', neighborhoods: ['Prospect Heights', 'Fort Greene'] },
  '11239': { borough: 'Brooklyn', neighborhoods: ['East New York'] },
  // Queens
  '11101': { borough: 'Queens', neighborhoods: ['Long Island City'] },
  '11102': { borough: 'Queens', neighborhoods: ['Astoria'] },
  '11103': { borough: 'Queens', neighborhoods: ['Astoria'] },
  '11104': { borough: 'Queens', neighborhoods: ['Sunnyside'] },
  '11105': { borough: 'Queens', neighborhoods: ['Astoria', 'Ditmars'] },
  '11106': { borough: 'Queens', neighborhoods: ['Astoria'] },
  '11354': { borough: 'Queens', neighborhoods: ['Flushing'] },
  '11355': { borough: 'Queens', neighborhoods: ['Flushing'] },
  '11356': { borough: 'Queens', neighborhoods: ['College Point'] },
  '11357': { borough: 'Queens', neighborhoods: ['Whitestone'] },
  '11358': { borough: 'Queens', neighborhoods: ['Flushing', 'Murray Hill'] },
  '11360': { borough: 'Queens', neighborhoods: ['Bayside'] },
  '11361': { borough: 'Queens', neighborhoods: ['Bayside'] },
  '11362': { borough: 'Queens', neighborhoods: ['Little Neck'] },
  '11363': { borough: 'Queens', neighborhoods: ['Douglaston'] },
  '11364': { borough: 'Queens', neighborhoods: ['Oakland Gardens'] },
  '11365': { borough: 'Queens', neighborhoods: ['Fresh Meadows'] },
  '11366': { borough: 'Queens', neighborhoods: ['Fresh Meadows'] },
  '11367': { borough: 'Queens', neighborhoods: ['Kew Gardens Hills'] },
  '11368': { borough: 'Queens', neighborhoods: ['Corona'] },
  '11369': { borough: 'Queens', neighborhoods: ['East Elmhurst'] },
  '11370': { borough: 'Queens', neighborhoods: ['East Elmhurst'] },
  '11371': { borough: 'Queens', neighborhoods: ['LaGuardia Airport'] },
  '11372': { borough: 'Queens', neighborhoods: ['Jackson Heights'] },
  '11373': { borough: 'Queens', neighborhoods: ['Elmhurst'] },
  '11374': { borough: 'Queens', neighborhoods: ['Rego Park'] },
  '11375': { borough: 'Queens', neighborhoods: ['Forest Hills'] },
  '11377': { borough: 'Queens', neighborhoods: ['Woodside'] },
  '11378': { borough: 'Queens', neighborhoods: ['Maspeth'] },
  '11379': { borough: 'Queens', neighborhoods: ['Middle Village'] },
  '11385': { borough: 'Queens', neighborhoods: ['Ridgewood', 'Glendale'] },
  '11411': { borough: 'Queens', neighborhoods: ['Cambria Heights'] },
  '11412': { borough: 'Queens', neighborhoods: ['St. Albans'] },
  '11413': { borough: 'Queens', neighborhoods: ['Springfield Gardens'] },
  '11414': { borough: 'Queens', neighborhoods: ['Howard Beach'] },
  '11415': { borough: 'Queens', neighborhoods: ['Kew Gardens'] },
  '11416': { borough: 'Queens', neighborhoods: ['Ozone Park'] },
  '11417': { borough: 'Queens', neighborhoods: ['Ozone Park'] },
  '11418': { borough: 'Queens', neighborhoods: ['Richmond Hill'] },
  '11419': { borough: 'Queens', neighborhoods: ['South Richmond Hill'] },
  '11420': { borough: 'Queens', neighborhoods: ['South Ozone Park'] },
  '11421': { borough: 'Queens', neighborhoods: ['Woodhaven'] },
  '11422': { borough: 'Queens', neighborhoods: ['Rosedale'] },
  '11423': { borough: 'Queens', neighborhoods: ['Hollis'] },
  '11426': { borough: 'Queens', neighborhoods: ['Bellerose'] },
  '11427': { borough: 'Queens', neighborhoods: ['Queens Village'] },
  '11428': { borough: 'Queens', neighborhoods: ['Queens Village'] },
  '11429': { borough: 'Queens', neighborhoods: ['Queens Village'] },
  '11432': { borough: 'Queens', neighborhoods: ['Jamaica'] },
  '11433': { borough: 'Queens', neighborhoods: ['Jamaica'] },
  '11434': { borough: 'Queens', neighborhoods: ['Jamaica'] },
  '11435': { borough: 'Queens', neighborhoods: ['Jamaica', 'Briarwood'] },
  '11436': { borough: 'Queens', neighborhoods: ['Jamaica'] },
  '11691': { borough: 'Queens', neighborhoods: ['Far Rockaway'] },
  '11692': { borough: 'Queens', neighborhoods: ['Arverne'] },
  '11693': { borough: 'Queens', neighborhoods: ['Far Rockaway'] },
  '11694': { borough: 'Queens', neighborhoods: ['Rockaway Park', 'Belle Harbor'] },
  '11697': { borough: 'Queens', neighborhoods: ['Breezy Point'] },
  // Bronx
  '10451': { borough: 'Bronx', neighborhoods: ['Mott Haven', 'Melrose'] },
  '10452': { borough: 'Bronx', neighborhoods: ['Highbridge', 'Concourse'] },
  '10453': { borough: 'Bronx', neighborhoods: ['Morris Heights', 'University Heights'] },
  '10454': { borough: 'Bronx', neighborhoods: ['Mott Haven', 'Port Morris'] },
  '10455': { borough: 'Bronx', neighborhoods: ['Longwood', 'Melrose'] },
  '10456': { borough: 'Bronx', neighborhoods: ['Morrisania', 'Claremont'] },
  '10457': { borough: 'Bronx', neighborhoods: ['Tremont'] },
  '10458': { borough: 'Bronx', neighborhoods: ['Belmont', 'Fordham'] },
  '10459': { borough: 'Bronx', neighborhoods: ['Longwood', 'Hunts Point'] },
  '10460': { borough: 'Bronx', neighborhoods: ['West Farms', 'Crotona Park East'] },
  '10461': { borough: 'Bronx', neighborhoods: ['Morris Park', 'Pelham Parkway'] },
  '10462': { borough: 'Bronx', neighborhoods: ['Parkchester', 'Van Nest'] },
  '10463': { borough: 'Bronx', neighborhoods: ['Kingsbridge', 'Riverdale'] },
  '10464': { borough: 'Bronx', neighborhoods: ['City Island'] },
  '10465': { borough: 'Bronx', neighborhoods: ['Throgs Neck', 'Country Club'] },
  '10466': { borough: 'Bronx', neighborhoods: ['Wakefield', 'Williamsbridge'] },
  '10467': { borough: 'Bronx', neighborhoods: ['Norwood', 'Williamsbridge'] },
  '10468': { borough: 'Bronx', neighborhoods: ['Fordham', 'University Heights'] },
  '10469': { borough: 'Bronx', neighborhoods: ['Eastchester', 'Baychester'] },
  '10470': { borough: 'Bronx', neighborhoods: ['Woodlawn'] },
  '10471': { borough: 'Bronx', neighborhoods: ['Riverdale', 'Fieldston'] },
  '10472': { borough: 'Bronx', neighborhoods: ['Soundview'] },
  '10473': { borough: 'Bronx', neighborhoods: ['Castle Hill', 'Soundview'] },
  '10474': { borough: 'Bronx', neighborhoods: ['Hunts Point'] },
  '10475': { borough: 'Bronx', neighborhoods: ['Co-op City'] },
  // Staten Island
  '10301': { borough: 'Staten Island', neighborhoods: ['St. George', 'Tompkinsville'] },
  '10302': { borough: 'Staten Island', neighborhoods: ['Port Richmond'] },
  '10303': { borough: 'Staten Island', neighborhoods: ['Mariners Harbor', 'Arlington'] },
  '10304': { borough: 'Staten Island', neighborhoods: ['Stapleton', 'Grymes Hill'] },
  '10305': { borough: 'Staten Island', neighborhoods: ['Rosebank', 'South Beach'] },
  '10306': { borough: 'Staten Island', neighborhoods: ['Midland Beach', 'New Dorp'] },
  '10307': { borough: 'Staten Island', neighborhoods: ['Tottenville'] },
  '10308': { borough: 'Staten Island', neighborhoods: ['Great Kills'] },
  '10309': { borough: 'Staten Island', neighborhoods: ['Charleston', 'Prince\'s Bay'] },
  '10310': { borough: 'Staten Island', neighborhoods: ['West Brighton', 'New Brighton'] },
  '10311': { borough: 'Staten Island', neighborhoods: ['Westerleigh'] },
  '10312': { borough: 'Staten Island', neighborhoods: ['Annadale', 'Eltingville'] },
  '10314': { borough: 'Staten Island', neighborhoods: ['New Springville', 'Bulls Head'] },
};

const AVAILABLE_PROMPTS = [
  // Intentions & Energy
  "I'm done playing it safe, now I want...",
  "The energy I'm looking for is...",
  "I know what I want, and it's...",
  "Green flags that make me say yes...",

  // Conversation starters
  "Ask me about the time I...",
  "The story I love telling is...",
  "You should message me if...",
  "Together we could...",

  // Personality reveals
  "I'm at my best when someone...",
  "My friends would say I'm...",
  "The hill I'll die on is...",
  "I'm weirdly attracted to...",

  // Fun & quirky
  "Don't be boring, be...",
  "I'll try anything once, especially...",
  "My most controversial opinion...",
  "The way to my heart is...",

  // Interests & adventures
  "What I'm curious about exploring...",
  "The thing I haven't tried yet but will...",
  "My happy place is...",
  "On a Sunday you'll find me...",

  // Connection style
  "The vibe that pulls me in is...",
  "I feel most connected when...",
  "What I bring to the table...",
  "Let's skip small talk and...",
];

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuthStore();
  const {
    balance,
    bonusLikes,
    subscription,
    isLowCredits,
    loadCredits,
    loadSubscription,
  } = useCreditsStore();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [creditsExpanded, setCreditsExpanded] = useState(false);
  const [editField, setEditField] = useState<'name' | 'bio'>('name');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Prompts state
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [selectPromptModalVisible, setSelectPromptModalVisible] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<ProfilePrompt | null>(null);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [savingPrompts, setSavingPrompts] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Referral state
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState<{ total_referrals: number; premium_days_earned: number } | null>(null);
  const [loadingReferral, setLoadingReferral] = useState(false);

  // Location state
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [zipInput, setZipInput] = useState('');
  const [zipData, setZipData] = useState<{ borough: string; neighborhoods: string[] } | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Prompt selector - defined early so it can be used in getProfileTips
  const openPromptSelector = () => {
    setSelectPromptModalVisible(true);
  };

  // Profile quality tips
  const getProfileTips = () => {
    const tips: { id: string; text: string; action: () => void; priority: number }[] = [];

    // Check photos - most important
    if (!photos || photos.length === 0) {
      tips.push({
        id: 'no_photos',
        text: 'Add photos to get 10x more matches',
        action: () => {/* PhotoGrid handles this */},
        priority: 1,
      });
    } else if (photos.length < 3) {
      tips.push({
        id: 'few_photos',
        text: `Add ${3 - photos.length} more photo${3 - photos.length > 1 ? 's' : ''} to get 3x more likes`,
        action: () => {/* PhotoGrid handles this */},
        priority: 2,
      });
    }

    // Check bio
    if (!user?.bio || user.bio.length < 20) {
      tips.push({
        id: 'no_bio',
        text: 'Write a bio - profiles with bios get 2x more matches',
        action: () => openEditModal('bio'),
        priority: 3,
      });
    }

    // Check prompts
    if (!user?.prompts || user.prompts.length === 0) {
      tips.push({
        id: 'no_prompts',
        text: 'Add prompts to show your personality',
        action: openPromptSelector,
        priority: 4,
      });
    }

    // Check looking_for
    if (!user?.looking_for) {
      tips.push({
        id: 'no_looking_for',
        text: 'Set what you\'re looking for to find better matches',
        action: () => router.push('/settings'),
        priority: 5,
      });
    }

    // Sort by priority and return top 2
    return tips.sort((a, b) => a.priority - b.priority).slice(0, 2);
  };

  const profileTips = getProfileTips();

  const loadReferralData = async () => {
    try {
      setLoadingReferral(true);
      const [codeRes, statsRes] = await Promise.all([
        referralApi.getCode(),
        referralApi.getStats(),
      ]);
      setReferralCode(codeRes.data.code);
      setReferralStats({
        total_referrals: statsRes.data.total_referrals,
        premium_days_earned: statsRes.data.premium_days_earned,
      });
    } catch (error) {
      console.error('Failed to load referral data:', error);
    } finally {
      setLoadingReferral(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const response = await profileApi.getShareLink();
      const { url, title, text } = response.data;

      await Share.share({
        message: `${text}\n\n${url}`,
        title: title,
        url: url, // iOS only
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        Alert.alert('Error', 'Failed to share profile');
      }
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;

    try {
      await Share.share({
        message: `Join me on feels - the dating app that puts real connections first! Use my code ${referralCode} to get 3 days of premium free.\n\nhttps://feelsfun.app/invite/${referralCode}`,
        title: 'Invite friends to feels',
      });
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
      }
    }
  };

  const loadPhotos = async () => {
    try {
      const response = await profileApi.get();
      const profile = response.data?.profile;
      const profilePhotos = profile?.photos || [];
      setPhotos(profilePhotos);

      // Merge profile data into user state
      if (profile && user) {
        const updatedUser = {
          ...user,
          name: profile.name ?? user.name,
          bio: profile.bio ?? user.bio,
          prompts: profile.prompts ?? user.prompts,
          looking_for: profile.looking_for ?? user.looking_for,
          age: profile.age ?? user.age,
        };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadCredits();
    loadSubscription();
    loadPhotos();
    loadReferralData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const openEditModal = (field: 'name' | 'bio') => {
    setEditField(field);
    setEditValue(field === 'name' ? (user?.name || '') : (user?.bio || ''));
    setEditModalVisible(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      Alert.alert('Error', `${editField === 'name' ? 'Name' : 'Bio'} cannot be empty`);
      return;
    }

    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/profile', { [editField]: editValue.trim() });
      setUser({ ...user!, [editField]: editValue.trim() });
      setSaveSuccess(true);
      setTimeout(() => {
        setEditModalVisible(false);
        setSaveSuccess(false);
      }, 500);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Prompts functions
  const openPromptEditor = (prompt: ProfilePrompt, index: number) => {
    setEditingPrompt(prompt);
    setEditingPromptIndex(index);
    setPromptAnswer(prompt.answer);
    setPromptModalVisible(true);
  };

  const selectPrompt = (question: string) => {
    const prompts = user?.prompts || [];
    if (prompts.length >= 3) {
      Alert.alert('Limit reached', 'You can only have up to 3 prompts');
      return;
    }

    const newPrompt = { question, answer: '' };
    const newIndex = prompts.length;

    setEditingPrompt(newPrompt);
    setEditingPromptIndex(newIndex);
    setPromptAnswer('');
    setSelectPromptModalVisible(false);
    setPromptModalVisible(true);
  };

  const savePrompt = async () => {
    if (!promptAnswer.trim()) {
      Alert.alert('Error', 'Please write an answer for this prompt');
      return;
    }

    setSavingPrompts(true);
    try {
      const currentPrompts = user?.prompts || [];
      let updatedPrompts: ProfilePrompt[];

      if (editingPromptIndex !== null && editingPromptIndex < currentPrompts.length) {
        updatedPrompts = [...currentPrompts];
        updatedPrompts[editingPromptIndex] = {
          question: editingPrompt!.question,
          answer: promptAnswer.trim()
        };
      } else {
        updatedPrompts = [...currentPrompts, {
          question: editingPrompt!.question,
          answer: promptAnswer.trim()
        }];
      }

      await profileApi.update({ prompts: updatedPrompts });
      setUser({ ...user!, prompts: updatedPrompts });
      setPromptModalVisible(false);
      setEditingPrompt(null);
      setEditingPromptIndex(null);
      setPromptAnswer('');
    } catch (error: any) {
      console.error('Save prompt error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save prompt. Please try again.');
    } finally {
      setSavingPrompts(false);
    }
  };

  const deletePrompt = async (index: number) => {
    Alert.alert(
      'Remove Prompt',
      'Are you sure you want to remove this prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSavingPrompts(true);
            try {
              const currentPrompts = user?.prompts || [];
              const updatedPrompts = currentPrompts.filter((_, i) => i !== index);
              await profileApi.update({ prompts: updatedPrompts });
              setUser({ ...user!, prompts: updatedPrompts });
            } catch (error: any) {
              console.error('Delete prompt error:', error);
              Alert.alert('Error', 'Failed to remove prompt. Please try again.');
            } finally {
              setSavingPrompts(false);
            }
          },
        },
      ]
    );
  };

  const availablePrompts = AVAILABLE_PROMPTS.filter(
    p => !(user?.prompts || []).some(up => up.question === p)
  );

  // Location functions
  const openLocationModal = () => {
    setZipInput('');
    setZipData(null);
    setSelectedNeighborhood('');
    setLocationModalVisible(true);
  };

  const handleZipChange = (zip: string) => {
    // Only allow numbers
    const cleanZip = zip.replace(/\D/g, '').slice(0, 5);
    setZipInput(cleanZip);

    if (cleanZip.length === 5) {
      const data = NYC_ZIP_DATA[cleanZip];
      if (data) {
        setZipData(data);
        // If only one neighborhood, auto-select it
        if (data.neighborhoods.length === 1) {
          setSelectedNeighborhood(data.neighborhoods[0]);
        } else {
          setSelectedNeighborhood('');
        }
      } else {
        setZipData(null);
        setSelectedNeighborhood('');
      }
    } else {
      setZipData(null);
      setSelectedNeighborhood('');
    }
  };

  const saveLocation = async () => {
    if (!zipData) {
      Alert.alert('Error', 'Please enter a valid NYC ZIP code');
      return;
    }

    setSavingLocation(true);
    try {
      // Display: neighborhood if selected, otherwise borough
      const location = selectedNeighborhood || zipData.borough;

      await profileApi.update({ neighborhood: location });
      setUser({ ...user!, neighborhood: location });
      setLocationModalVisible(false);
    } catch (error: any) {
      console.error('Save location error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={handleShareProfile}>
              <ShareIcon size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/settings')}>
              <SettingsIcon size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {user?.photos?.[0] ? (
              <Image
                source={{ uri: user.photos[0] }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserIcon size={48} color={colors.text.tertiary} />
              </View>
            )}
            <TouchableOpacity style={styles.editBadge}>
              <EditIcon size={14} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => openEditModal('name')} style={styles.nameRow}>
            <Text style={styles.name}>
              {user?.name || 'Tap to add name'}
              {user?.age && `, ${user.age}`}
            </Text>
            {user?.is_verified && (
              <View style={styles.verifiedBadge}>
                <CheckIcon size={12} color={colors.text.primary} />
              </View>
            )}
          </TouchableOpacity>
          {user?.location && (
            <View style={styles.locationRow}>
              <MapPinIcon size={14} color={colors.text.secondary} />
              <Text style={styles.location}>{user.location}</Text>
            </View>
          )}
        </View>

        {/* Search Filters - Primary Action */}
        <View style={styles.searchFiltersContainer}>
          <TouchableOpacity
            style={styles.searchFiltersButton}
            onPress={() => router.push('/settings')}
          >
            <View style={styles.searchFiltersContent}>
              <View style={styles.searchFiltersIcon}>
                <SlidersIcon size={22} color={colors.primary.DEFAULT} />
              </View>
              <View>
                <Text style={styles.searchFiltersTitle}>Search Filters</Text>
                <Text style={styles.searchFiltersSubtitle}>Age, gender, distance</Text>
              </View>
            </View>
            <ChevronRightIcon size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Profile Tips or Edit Profile Card */}
        {user?.bio && user.bio.length >= 20 ? (
          // Profile is complete enough - show Edit Profile card
          <View style={styles.tipsContainer}>
            <TouchableOpacity
              style={styles.editProfileCard}
              onPress={() => openEditModal('bio')}
              activeOpacity={0.8}
            >
              <View style={styles.editProfileIcon}>
                <EditIcon size={18} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.editProfileText}>Edit Profile</Text>
              <ChevronRightIcon size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>
        ) : (
          // Profile incomplete - show tips
          profileTips.length > 0 && (
            <View style={styles.tipsContainer}>
              {profileTips.map((tip) => (
                <TouchableOpacity
                  key={tip.id}
                  style={styles.tipCard}
                  onPress={tip.action}
                  activeOpacity={0.8}
                >
                  <View style={styles.tipIcon}>
                    <SparklesIcon size={16} color={colors.secondary.DEFAULT} />
                  </View>
                  <Text style={styles.tipText}>{tip.text}</Text>
                  <ChevronRightIcon size={16} color={colors.text.tertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        {/* Credits Card */}
        <TouchableOpacity
          style={styles.creditsCard}
          onPress={() => setCreditsExpanded(!creditsExpanded)}
          activeOpacity={0.8}
        >
          <View style={styles.creditsHeader}>
            <View style={styles.creditsMainRow}>
              <View style={styles.creditsItem}>
                <CoinIcon size={22} color={colors.secondary.DEFAULT} />
                <View>
                  <Text style={styles.creditsValue}>{balance}</Text>
                  <Text style={styles.creditsLabel}>Credits</Text>
                </View>
                {isLowCredits() && (
                  <View style={styles.lowCreditsIndicator}>
                    <Text style={styles.lowCreditsText}>Low</Text>
                  </View>
                )}
              </View>

              <View style={styles.creditsDivider} />

              <View style={styles.creditsItem}>
                <HeartFilledIcon size={22} color={colors.primary.DEFAULT} />
                <View>
                  <Text style={styles.creditsValue}>{bonusLikes}</Text>
                  <Text style={styles.creditsLabel}>Bonus Likes</Text>
                </View>
              </View>

              {subscription && subscription.status === 'active' && (
                <>
                  <View style={styles.creditsDivider} />
                  <View style={styles.creditsItem}>
                    <CrownIcon size={22} color={colors.secondary.light} />
                    <View>
                      <Text style={styles.creditsValuePremium}>
                        {subscription.tier.charAt(0).toUpperCase() +
                          subscription.tier.slice(1)}
                      </Text>
                      <Text style={styles.creditsLabel}>Active</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {creditsExpanded ? (
              <ChevronUpIcon size={18} color={colors.text.tertiary} />
            ) : (
              <ChevronDownIcon size={18} color={colors.text.tertiary} />
            )}
          </View>

          {creditsExpanded && (
            <View style={styles.creditsBreakdown}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Super Likes cost</Text>
                <Text style={styles.breakdownValue}>5 credits each</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Daily bonus</Text>
                <Text style={styles.breakdownValue}>+10 credits</Text>
              </View>
              {subscription && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subscription</Text>
                  <Text style={styles.breakdownValue}>
                    Renews{' '}
                    {new Date(subscription.expiresAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.getMoreButton}
                onPress={() => {
                  setCreditsExpanded(false);
                  setPremiumModalVisible(true);
                }}
              >
                <Text style={styles.getMoreText}>Get More Credits</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {/* Photo Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.photoHint}>{photos.length}/6</Text>
          </View>
          {loadingPhotos ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
          ) : (
            <PhotoGrid
              photos={photos}
              onPhotosChange={(updatedPhotos) => {
                setPhotos(updatedPhotos);
                // Also update user photos in authStore for avatar
                if (user) {
                  setUser({
                    ...user,
                    photos: updatedPhotos.map((p) => p.url),
                  });
                }
              }}
              maxPhotos={5}
            />
          )}
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <TouchableOpacity onPress={() => openEditModal('bio')}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.bioCard} onPress={() => openEditModal('bio')}>
            {user?.bio ? (
              <Text style={styles.bioText}>{user.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                Tap to add a bio...
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Home/Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Home</Text>
            <TouchableOpacity onPress={openLocationModal}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.locationCard} onPress={openLocationModal}>
            <MapPinIcon size={20} color={colors.primary.DEFAULT} />
            {user?.neighborhood ? (
              <Text style={styles.locationText}>{user.neighborhood}</Text>
            ) : (
              <Text style={styles.locationPlaceholder}>
                Set your neighborhood...
              </Text>
            )}
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Prompts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Prompts</Text>
            {(user?.prompts?.length || 0) < 3 && (
              <TouchableOpacity onPress={openPromptSelector} style={styles.addButton}>
                <PlusIcon size={16} color={colors.primary.DEFAULT} />
                <Text style={styles.editText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {savingPrompts && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.primary.DEFAULT} />
            </View>
          )}

          {user?.prompts && user.prompts.length > 0 ? (
            user.prompts.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptCard}
                onPress={() => openPromptEditor(prompt, index)}
              >
                <View style={styles.promptHeader}>
                  <Text style={styles.promptQuestion}>{prompt.question}</Text>
                  <TouchableOpacity
                    onPress={() => deletePrompt(index)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <XIcon size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <TouchableOpacity style={styles.emptyPrompts} onPress={openPromptSelector}>
              <Text style={styles.emptyPromptsText}>
                Add prompts to show your personality
              </Text>
              <Text style={styles.emptyPromptsHint}>
                Tap "+ Add" to get started
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/notifications')}
          >
            <BellIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Notifications</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/privacy')}
          >
            <ShieldIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Privacy</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setPremiumModalVisible(true)}
          >
            <CrownIcon size={20} color={colors.secondary.DEFAULT} />
            <Text style={styles.actionText}>Premium</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/settings/help')}
          >
            <HelpCircleIcon size={20} color={colors.text.secondary} />
            <Text style={styles.actionText}>Help & Support</Text>
            <ChevronRightIcon size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Invite Friends / Referral */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Invite Friends</Text>
          </View>

          <View style={styles.referralCard}>
            <View style={styles.referralIconContainer}>
              <GiftIcon size={28} color={colors.secondary.DEFAULT} />
            </View>
            <View style={styles.referralContent}>
              <Text style={styles.referralTitle}>Get 7 days of premium free</Text>
              <Text style={styles.referralSubtitle}>
                Share your code. Friends get 3 days, you get 7 when they sign up.
              </Text>

              {loadingReferral ? (
                <ActivityIndicator color={colors.primary.DEFAULT} style={{ marginTop: spacing.md }} />
              ) : (
                <>
                  <View style={styles.referralCodeRow}>
                    <Text style={styles.referralCode}>{referralCode || '...'}</Text>
                    <TouchableOpacity
                      style={styles.shareCodeButton}
                      onPress={handleShareReferral}
                    >
                      <ShareIcon size={16} color={colors.text.primary} />
                      <Text style={styles.shareCodeText}>Share</Text>
                    </TouchableOpacity>
                  </View>

                  {referralStats && referralStats.total_referrals > 0 && (
                    <View style={styles.referralStatsRow}>
                      <Text style={styles.referralStatsText}>
                        {referralStats.total_referrals} friend{referralStats.total_referrals !== 1 ? 's' : ''} joined
                        {referralStats.premium_days_earned > 0 && ` (+${referralStats.premium_days_earned} days earned)`}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <LogOutIcon size={20} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Name/Bio Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} disabled={saving}>
                <Text style={[styles.modalCancel, saving && { opacity: 0.5 }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                Edit {editField === 'name' ? 'Name' : 'Bio'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : saveSuccess ? (
                  <Text style={styles.modalSaveSuccess}>Saved!</Text>
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                editField === 'bio' && styles.modalInputMultiline,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={editField === 'name' ? 'Your name' : 'Tell us about yourself...'}
              placeholderTextColor={colors.text.disabled}
              multiline={editField === 'bio'}
              numberOfLines={editField === 'bio' ? 4 : 1}
              autoFocus
              maxLength={editField === 'name' ? 50 : 500}
              editable={!saving}
            />

            <Text style={styles.charCount}>
              {editValue.length}/{editField === 'name' ? 50 : 500}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Select Prompt Modal */}
      <Modal
        visible={selectPromptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectPromptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.promptSelectContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectPromptModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Choose a Prompt</Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.promptList}>
              {availablePrompts.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.promptSelectOption}
                  onPress={() => selectPrompt(prompt)}
                >
                  <Text style={styles.promptSelectText}>{prompt}</Text>
                  <PlusIcon size={22} color={colors.primary.DEFAULT} />
                </TouchableOpacity>
              ))}
              {availablePrompts.length === 0 && (
                <Text style={styles.noPromptsText}>
                  You've used all available prompts!
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Prompt Modal */}
      <Modal
        visible={promptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPromptModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setPromptModalVisible(false)}
                disabled={savingPrompts}
              >
                <Text style={[styles.modalCancel, savingPrompts && { opacity: 0.5 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Your Answer</Text>
              <TouchableOpacity onPress={savePrompt} disabled={savingPrompts}>
                {savingPrompts ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Text style={styles.modalSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.promptEditQuestion}>{editingPrompt?.question}</Text>

            <TextInput
              style={[styles.modalInput, styles.modalInputMultiline]}
              value={promptAnswer}
              onChangeText={setPromptAnswer}
              placeholder="Write your answer..."
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={4}
              autoFocus
              maxLength={200}
              editable={!savingPrompts}
            />

            <Text style={styles.charCount}>
              {promptAnswer.length}/200
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Location Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(false)}
                disabled={savingLocation}
              >
                <Text style={[styles.modalCancel, savingLocation && { opacity: 0.5 }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Your Location</Text>
              <TouchableOpacity onPress={saveLocation} disabled={savingLocation || !zipData}>
                {savingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Text style={[styles.modalSave, !zipData && { opacity: 0.5 }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.locationLabel}>ZIP Code</Text>
            <TextInput
              style={styles.zipInput}
              value={zipInput}
              onChangeText={handleZipChange}
              placeholder="Enter your ZIP code"
              placeholderTextColor={colors.text.disabled}
              keyboardType="number-pad"
              maxLength={5}
              editable={!savingLocation}
            />

            {zipInput.length === 5 && !zipData && (
              <Text style={styles.zipError}>Not a valid NYC ZIP code</Text>
            )}

            {zipData && (
              <View style={styles.zipResult}>
                <Text style={styles.zipBorough}>{zipData.borough}</Text>

                {zipData.neighborhoods.length > 1 && (
                  <>
                    <Text style={[styles.locationLabel, { marginTop: spacing.lg }]}>
                      Neighborhood (optional)
                    </Text>
                    <View style={styles.neighborhoodOptions}>
                      {zipData.neighborhoods.map((n) => (
                        <TouchableOpacity
                          key={n}
                          style={[
                            styles.neighborhoodOption,
                            selectedNeighborhood === n && styles.neighborhoodOptionSelected,
                          ]}
                          onPress={() => setSelectedNeighborhood(
                            selectedNeighborhood === n ? '' : n
                          )}
                        >
                          <Text
                            style={[
                              styles.neighborhoodOptionText,
                              selectedNeighborhood === n && styles.neighborhoodOptionTextSelected,
                            ]}
                          >
                            {n}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.locationPreview}>
                  Will display as: {selectedNeighborhood || zipData.borough}
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Premium Modal */}
      <PremiumModal
        visible={premiumModalVisible}
        onClose={() => setPremiumModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.bg.primary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  verifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  location: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  // Credits Card styles
  creditsCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditsMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creditsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creditsValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.extrabold as any,
    color: colors.text.primary,
  },
  creditsValuePremium: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.secondary.light,
  },
  creditsLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
  },
  creditsDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.lg,
  },
  lowCreditsIndicator: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  lowCreditsText: {
    fontSize: 10,
    fontWeight: typography.weights.bold as any,
    color: colors.error,
    textTransform: 'uppercase',
  },
  creditsBreakdown: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  breakdownLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  breakdownValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.semibold as any,
  },
  getMoreButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  getMoreText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold as any,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  editText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  photoHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
  },
  bioCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minHeight: 80,
  },
  bioText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
  },
  bioPlaceholder: {
    fontSize: typography.sizes.base,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  // Location styles
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  locationText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  locationPlaceholder: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  locationLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  zipInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 4,
  },
  zipError: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  zipResult: {
    marginTop: spacing.lg,
  },
  zipBorough: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
  },
  neighborhoodOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  neighborhoodOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  neighborhoodOptionSelected: {
    backgroundColor: colors.primary.muted,
    borderColor: colors.primary.DEFAULT,
  },
  neighborhoodOptionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
    color: colors.text.secondary,
  },
  neighborhoodOptionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: typography.weights.semibold as any,
  },
  locationPreview: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
  // Prompts styles
  loadingOverlay: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  promptCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  promptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  promptQuestion: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  promptAnswer: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
  },
  emptyPrompts: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    padding: spacing['2xl'],
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.light,
    borderStyle: 'dashed',
  },
  emptyPromptsText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptyPromptsHint: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  promptEditQuestion: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.lg,
  },
  promptList: {
    maxHeight: 400,
  },
  promptSelectOption: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptSelectText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    flex: 1,
  },
  promptSelectContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
    maxHeight: '70%',
    marginTop: 'auto',
  },
  noPromptsText: {
    fontSize: typography.sizes.base,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  searchFiltersContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  searchFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.muted,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  searchFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchFiltersIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(232, 93, 117, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchFiltersTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  searchFiltersSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.primary.light,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
  },
  logoutButton: {
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.error,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg.secondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalCancel: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  modalSave: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.primary.DEFAULT,
  },
  modalSaveSuccess: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold as any,
    color: colors.success,
  },
  modalInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  modalInputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  // Referral styles
  referralCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary.muted,
  },
  referralIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(232, 176, 73, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralContent: {
    flex: 1,
  },
  referralTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold as any,
    color: colors.text.primary,
  },
  referralSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  referralCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  referralCode: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.extrabold as any,
    color: colors.secondary.DEFAULT,
    letterSpacing: 2,
  },
  shareCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  shareCodeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
    color: colors.text.primary,
  },
  referralStatsRow: {
    marginTop: spacing.sm,
  },
  referralStatsText: {
    fontSize: typography.sizes.sm,
    color: colors.success,
    fontWeight: typography.weights.medium as any,
  },
  // Profile Tips styles
  tipsContainer: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  editProfileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium as any,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 176, 73, 0.1)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 176, 73, 0.3)',
    gap: spacing.sm,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 176, 73, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium as any,
  },
});
