/**
 * useChat.js — Chat state management hook.
 * Handles the agentic response format: emotion, suggestions, and agent_steps.
 */
import { useCallback, useState } from 'react'
import { sendMessage } from '../services/api'

export function useChat(sessionId, setSessionId, profile) {
  const [messages, setMessages]       = useState([])
  const [isLoading, setIsLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState([])

  const sendChatMessage = useCallback(
    async (text) => {
      if (!text.trim()) return

      setSuggestions([])

      const userMsgId = `user-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id:            userMsgId,
          role:          'user',
          content:       text.trim(),
          emotion:       null,
          emotion_score: null,
          emotion_color: null,
          agent_steps:   [],
          timestamp:     new Date().toISOString(),
        },
      ])
      setIsLoading(true)

      try {
        const data = await sendMessage(text.trim(), sessionId, profile)

        if (!sessionId && data.session_id) setSessionId(data.session_id)

        // Attach emotion data to the user message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMsgId
              ? {
                  ...msg,
                  emotion:       data.emotion,
                  emotion_score: data.emotion_score,
                  emotion_color: data.emotion_color,
                }
              : msg,
          ),
        )

        // Append AI reply with agent steps
        setMessages((prev) => [
          ...prev,
          {
            id:          `ai-${Date.now()}`,
            role:        'assistant',
            content:     data.response,
            agent_steps: data.agent_steps || [],   // tool calls made during this turn
            timestamp:   new Date().toISOString(),
          },
        ])

        setSuggestions(data.suggestions || [])
      } catch (err) {
        console.error('Chat API error:', err)
        setMessages((prev) => [
          ...prev,
          {
            id:          `err-${Date.now()}`,
            role:        'assistant',
            content:     'Something went wrong — please try again!',
            agent_steps: [],
            timestamp:   new Date().toISOString(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [sessionId, setSessionId, profile],
  )

  const loadHistory = useCallback((newSessionId, rawMessages) => {
    setSessionId(newSessionId)
    setSuggestions([])
    setMessages(
      rawMessages.map((m, i) => ({
        id:          `hist-${i}-${m.role}`,
        role:        m.role === 'assistant' ? 'assistant' : 'user',
        content:     m.content || '',
        emotion:     m.emotion       || null,
        emotion_score: m.emotion_score || null,
        emotion_color: m.emotion_color || null,
        agent_steps: m.agent_steps   || [],
        timestamp:   m.created_at   || new Date().toISOString(),
      }))
    )
  }, [setSessionId])

  return { messages, isLoading, suggestions, sendChatMessage, loadHistory }
}
