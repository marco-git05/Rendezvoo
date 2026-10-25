// Shared types — keep in sync with supabase/schema.sql.

export type Profile = { id: string; name: string | null; avatar_url: string | null };
export type Home = { user_id: string; lat: number; lng: number };

export type GroupKind = 'friends' | 'school' | 'work';

export type Group = {
  id: string;
  name: string;
  kind: GroupKind;
  avatar_url: string | null;
  invite_code: string;
  admin_id: string;
  created_at: string;
};

export type Membership = {
  group_id: string;
  user_id: string;
  color: string;
  pinned: boolean;
  share_location: boolean;
  is_priority: boolean;
  groups?: Group;
  profiles?: Profile;
};

export type QuestionType = 'frq' | 'yn' | 'mcq';
export type Question = { id: string; type: QuestionType; prompt: string; options?: string[] };

export type Invite = {
  id: string;
  group_id: string;
  creator_id: string;
  title: string | null;
  dates: string[];
  questions: Question[];
  deadline: string | null;
  status: 'open' | 'planned' | 'closed';
  tz_offset: number;
  location_hint: string | null;
  album: boolean;
  start_hour: number; // first hour people can pick (24h)
  end_hour: number;   // hour the range ends (exclusive), e.g. 22 = until 10 PM
  created_at: string;
  profiles?: Pick<Profile, 'name'>;
};

export type Availability = Record<string, number[]>; // { '2026-10-31': [18, 19, 20] } — hours free (24h)

export type InviteResponse = {
  id: string;
  invite_id: string;
  user_id: string;
  availability: Availability;
  answers: Record<string, unknown>;
  profiles?: Pick<Profile, 'name' | 'avatar_url'>;
};

// A real place from SerpAPI Google Maps.
export type PlaceResult = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews?: number;
  price?: string;
  type?: string;
  open_state?: string;
  phone?: string;
  website?: string;
  thumbnail?: string;
  avg_miles?: number; // average distance from members' shared homes
  max_miles?: number;
};

// A local event from SerpAPI Google Events.
export type EventResult = {
  title: string;
  when?: string;
  venue?: string;
  address?: string;
  link?: string;
  thumbnail?: string;
  price?: string;
};

// Drive time from a member's shared home (SerpAPI Google Maps Directions).
export type TravelTime = { name: string; minutes: number; text: string; distance?: string; lat: number; lng: number };

export type EventDetails = {
  description?: string;
  reasoning?: string;
  itinerary?: { time?: string; activity: string; place?: string }[];
  free_people?: string[];
  drivers?: string[];
  place?: PlaceResult;          // the spot the AI chose
  options?: PlaceResult[];      // other places it considered
  travel?: TravelTime[];        // everyone's drive time there
  nearby_events?: EventResult[];
  previous?: { title: string; location: string | null; when: string }[]; // plans the group turned down
  travel_limit?: number; // strictest "how far will you travel" answer, in minutes
};

export type HangoutEvent = {
  id: string;
  group_id: string;
  invite_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  details: EventDetails | null;
  album: boolean;
  created_by: string | null;
  groups?: Pick<Group, 'id' | 'name'> & { admin_id?: string };
};

export type RsvpStatus = 'going' | 'declined' | 'pending';
export type Rsvp = { event_id: string; user_id: string; status: RsvpStatus; profiles?: Profile };

export type Photo = { id: string; event_id: string; user_id: string; url: string; created_at: string };
