import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getGroupHangouts } from '../lib/api'

export function useGroupHangouts(groupId) {
  const [hangouts, setHangouts] = useState([])

  const refetch = useCallback(async () => {
    const { data } = await getGroupHangouts(groupId)
    setHangouts(data ?? [])
  }, [groupId])

  useEffect(() => {
    if (!groupId) return

    refetch() // load once when the page opens

    const channel = supabase
      .channel('hangouts-' + groupId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hangouts', filter: `group_id=eq.${groupId}` },
        () => refetch()
      )
      .subscribe()

    // cleanup: stop listening when the user leaves the page
    return () => {
      supabase.removeChannel(channel)
    }
  }, [groupId, refetch])

  return hangouts
}