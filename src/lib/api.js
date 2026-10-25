import { supabase } from './supabase'

// Home screen: my groups, pinned first
export const getMyGroups = async () => {
  const { data, error } = await supabase
    .from('group_members')
    .select('is_pinned, calendar_color, role, groups(*)')
    .order('is_pinned', { ascending: false })
  if (error) throw error
  return data
}

export const createGroup = async (name, groupType) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('groups')
    .insert({ name, group_type: groupType, created_by: user.id })
    .select().single()
  if (error) throw error
  return data
}

export const joinGroup = (code) => supabase.rpc('join_group_by_code', { code })

// Invite maker: one form + its dates + its questions
export const createHangoutForm = async ({ groupId, title, deadline, dates, questions }) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: form, error } = await supabase.from('hangout_forms')
    .insert({ group_id: groupId, created_by: user.id, title, deadline })
    .select().single()
  if (error) throw error

  await supabase.from('form_dates').insert(dates.map(date => ({ form_id: form.id, date })))
  await supabase.from('form_questions').insert(
    questions.map((q, i) => ({ form_id: form.id, position: i, ...q }))
    // q = { prompt, type: 'frq' | 'yn' | 'mcq', options?, premade_key? }
  )
  return form
}

// Answering a form
export const submitResponse = async ({ formId, availability, answers }) => {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('form_availability').insert(
    availability.map(a => ({ form_id: formId, user_id: user.id, ...a })))
  await supabase.from('form_answers').upsert(
    answers.map(a => ({ question_id: a.questionId, user_id: user.id, answer: a.value })),
    { onConflict: 'question_id,user_id' })
  await supabase.from('form_responses').upsert({ form_id: formId, user_id: user.id })
}

// Personal calendar: everything I've accepted
export const getMyCalendar = async (from, to) => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.from('hangout_rsvps')
    .select('status, hangouts(*, groups(name))')
    .eq('user_id', user.id).eq('status', 'accepted')
    .gte('hangouts.starts_at', from).lte('hangouts.starts_at', to)
  if (error) throw error
  return data.filter(r => r.hangouts)
}

// Group calendar + past/upcoming list
export const getGroupHangouts = (groupId) =>
  supabase.from('hangouts').select('*').eq('group_id', groupId).order('starts_at')

export const respondToHangout = (hangoutId, userId, status) =>
  supabase.from('hangout_rsvps').upsert({ hangout_id: hangoutId, user_id: userId, status })

// Photos
export const uploadAlbumPhoto = async (hangoutId, file) => {
  const { data: { user } } = await supabase.auth.getUser()
  const path = `${hangoutId}/${crypto.randomUUID()}-${file.name}`
  const { error } = await supabase.storage.from('hangout-photos').upload(path, file)
  if (error) throw error
  return supabase.from('hangout_photos')
    .insert({ hangout_id: hangoutId, uploaded_by: user.id, storage_path: path })
}

// Group settings: personal color / pin / share-house toggle
export const updateMyGroupSettings = (groupId, userId, changes) =>
  supabase.from('group_members').update(changes)  // is_pinned, calendar_color, share_location
    .eq('group_id', groupId).eq('user_id', userId)