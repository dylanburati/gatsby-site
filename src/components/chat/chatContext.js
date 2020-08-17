import React, { useState, useEffect, useContext, useCallback } from 'react';
import { globalHistory } from '@reach/router';
import qs from 'querystring';
import WSClient from '../../services/wsClient';
import { UserContext } from './userContext';
import { useAsyncTask } from '../../hooks/useAsyncTask';
import { navigate } from 'gatsby';

export const ChatContext = React.createContext({
  roomId: null,
  roomTitle: null,
  roomUsers: null,
  nickname: null,
  isLoading: false,
  isConnected: false,
  sendMessage: () => {},
  messages: [],
});

const wsUrl = 'ws://localhost:7000/ws';
export function ChatProvider({ children }) {
  const { location } = globalHistory;
  const { createGuest, token } = useContext(UserContext);
  const [roomId] = useState(() => {
    const { room } = qs.parse(location.search.replace(/^\?/, ''));
    return room;
  });
  const [roomTitle, setRoomTitle] = useState('');
  const [nickname, setNickname] = useState('');
  const [roomUsers, setRoomUsers] = useState({});

  useEffect(() => {
    if (roomId && !token) {
      createGuest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  const [wsClient, setWsClient] = useState();
  const connect = useAsyncTask(
    useCallback(
      async client => {
        const msg = await client.sendAndListen({
          action: 'login',
          data: { token },
        });
        setWsClient(client);
        setRoomTitle(msg.title);
        setNickname(msg.nickname);
        if (msg.isFirstLogin) console.log('prompt');
      },
      [token]
    )
  );
  useEffect(() => {
    if (roomId && token && !wsClient && !connect.loading) {
      const nextClient = new WSClient(`${wsUrl}/${roomId}`, connect.run);
      nextClient.connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);
  useEffect(() => {
    if (wsClient) wsClient.setConnector(connect.run);
  }, [connect.run, wsClient]);

  const sendMessage = m => {
    if (wsClient) wsClient.send(m);
  };

  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (!wsClient) return;

    const lk = wsClient.addListener(message => {
      const toAdd = [];
      if (message.type === 'message') {
        toAdd.push(message.data);
      } else if (message.type === 'getMessages') {
        toAdd.push(...message.data);
      }
      if (toAdd.length) {
        setMessages(messages => {
          const ids = new Map(messages.map((m, i) => [m.id, i]));
          const next = [...messages];
          toAdd.forEach(m => {
            const replaceIdx = ids.get(m.id);
            if (replaceIdx === undefined) {
              next.push(m);
              ids.set(m.id, undefined);
            } else {
              next[replaceIdx] = m;
            }
          });
          setMessages(next);
        });
      }
    });
    wsClient.send({
      action: 'getMessages',
      data: {},
    });

    return () => {
      if (wsClient) {
        wsClient.disconnect();
        wsClient.removeListener(lk);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsClient]);
  useEffect(() => {
    if (!wsClient) return;

    const lk = wsClient.addListener(message => {
      if (message.type === 'error') {
        if (typeof message.message === 'string') {
          if (message.message.startsWith('Unauthenticated')) wsClient.connect();
          else if (message.message.startsWith('Invalid conversation id'))
            navigate('/quip');
        }
      }
    });

    return () => {
      if (wsClient) wsClient.removeListener(lk);
    };
  }, [wsClient]);
  useEffect(() => {
    if (!wsClient) return;

    const lk = wsClient.addListener(message => {
      if (message.type === 'setNickname') {
        const { userId, nickname } = message.data;
        setRoomUsers(state => ({
          ...state,
          [userId]: {
            ...state[userId],
            nickname,
          },
        }));
        setMessages(messages =>
          messages.map(m => {
            const mc = { ...m };
            if (mc.sender.userId === userId) mc.sender.nickname = nickname;
            return mc;
          })
        );
      }
    });

    return () => {
      if (wsClient) wsClient.removeListener(lk);
    };
  }, [wsClient]);

  return (
    <ChatContext.Provider
      value={{
        roomId,
        roomTitle,
        roomUsers,
        nickname,
        isLoading: connect.loading,
        isConnected: wsClient != null,
        sendMessage,
        messages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
