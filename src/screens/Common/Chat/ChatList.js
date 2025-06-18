import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import ActionSheet from 'react-native-actionsheet';
import { firebase } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const ChatList = () => {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [members, setMembers] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedViewImage, setSelectedViewImage] = useState(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const navigation = useNavigation();
  const actionSheetRef = useRef();
  

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (Platform.OS === 'android') setKeyboardOffset(0);
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS === 'android') setKeyboardOffset(-50);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Fetch community members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersSnapshot = await firebase.firestore()
          .collection('communities')
          .doc(communityData?.id)
          .collection('users')
          .where('approved', '==', true)
          .get();
        
        const membersData = {};
        membersSnapshot.docs.forEach(doc => {
          membersData[doc.id] = doc.data();
        });
        
        setMembers(membersData);
      } catch (error) {
        console.error('Error fetching community members:', error);
      }
    };
    
    if (communityData?.id) {
      fetchMembers();
    }
  }, [communityData?.id]);

  // Fetch messages from Firebase and track unread messages
  useEffect(() => {
    if (!communityData?.id || !userData?.id) return;

    const unsubscribe = firebase.firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('chats')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(async (snapshot) => {
        const messageList = [];
        let newUnreadCount = 0;
        
        for (const doc of snapshot.docs) {
          const message = {
            id: doc.id,
            ...doc.data(),
            dateFormatted: doc.data().timestamp ? format(doc.data().timestamp.toDate(), 'h:mm a') : ''
          };
          
          // Check if message is unread
          if (!message.read?.includes(userData.id)) {
            newUnreadCount++;
            // Mark as read if not already
            if (!message.read) {
              await firebase.firestore()
                .collection('communities')
                .doc(communityData.id)
                .collection('chats')
                .doc(doc.id)
                .update({
                  read: firebase.firestore.FieldValue.arrayUnion(userData.id)
                });
            }
          }
          
          messageList.push(message);
        }
        
        setUnreadCount(newUnreadCount);
        setMessages(messageList.reverse());
        setLoading(false);
      }, error => {
        console.error('Error fetching messages:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [communityData?.id, userData?.id]);

  useEffect(() => {
    if (!communityData?.id || !userData?.id) return;
  
    // Mark messages from OTHER users as seen when the chat is opened/messages are loaded
    const markOtherMessagesAsSeen = async () => {
      try {
        const batch = firebase.firestore().batch();
        const messagesRef = firebase.firestore()
          .collection('communities')
          .doc(communityData.id)
          .collection('chats');
  
        // Get messages that are NOT from current user and NOT already seen by current user
        const unSeenMessagesQuery = await messagesRef
          .where('senderId', '!=', userData.id) // Only other users' messages
          .get();
  
        let hasUpdates = false;
  
        unSeenMessagesQuery.docs.forEach(doc => {
          const messageData = doc.data();
          const seenBy = messageData.seenBy || [];
          
          // If current user hasn't seen this message yet, mark it as seen
          if (!seenBy.includes(userData.id)) {
            batch.update(doc.ref, {
              seenBy: firebase.firestore.FieldValue.arrayUnion(userData.id)
            });
            hasUpdates = true;
          }
        });
  
        // Only commit if there are updates
        if (hasUpdates) {
          await batch.commit();
        }
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    };
  
    // Mark messages as seen when chat opens
    markOtherMessagesAsSeen();
  
    // Also mark new messages as seen when they arrive (for real-time updates)
    const unsubscribeSeenUpdates = firebase.firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('chats')
      .where('senderId', '!=', userData.id)
      .onSnapshot(async (snapshot) => {
        const batch = firebase.firestore().batch();
        let hasUpdates = false;
  
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const messageData = change.doc.data();
            const seenBy = messageData.seenBy || [];
            
            // If current user hasn't seen this new message, mark it as seen
            if (!seenBy.includes(userData.id)) {
              batch.update(change.doc.ref, {
                seenBy: firebase.firestore.FieldValue.arrayUnion(userData.id)
              });
              hasUpdates = true;
            }
          }
        });
  
        if (hasUpdates) {
          try {
            await batch.commit();
          } catch (error) {
            console.error('Error updating seen status for new messages:', error);
          }
        }
      });
  
    return () => {
      unsubscribeSeenUpdates();
    };
  }, [communityData?.id, userData?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if ((!messageText || !messageText.trim()) && !selectedImage) return;
    
    Keyboard.dismiss();
    setUploading(true);
    
    try {
      let imageUrl = null;
      
      if (selectedImage) {
        const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
        const imageRef = storage().ref(`communities/${communityData?.id}-${cleanName}/chats/${Date.now()}-${selectedImage.name}`);
        await imageRef.putFile(selectedImage.uri);
        imageUrl = await imageRef.getDownloadURL();
      }
      
      await firebase.firestore()
        .collection('communities')
        .doc(communityData?.id)
        .collection('chats')
        .add({
          senderId: userData.id,
          text: messageText.trim(),
          imageUrl: imageUrl,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          read: [userData.id], // Keep this for backward compatibility
          seenBy: [userData.id], // Mark your own message as seen by you
          edited: false,
          deleted: false
        });
      
      setMessageText('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  };

  const handlePickImage = () => {
    const options = {
      selectionLimit: 1,
      mediaType: 'photo',
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    };
  
    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        setSelectedImage({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName || 'image.jpg',
        });
        setImagePreview(asset.uri);
      }
    });
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const openImageViewer = (imageUrl) => {
    setSelectedViewImage(imageUrl);
    setImageViewerVisible(true);
  };

  const showOptionsMenu = () => {
    actionSheetRef.current?.show();
  };

  const handleOptionSelect = (index) => {
    if (index === 0) {
      // Search
      Alert.alert('Search functionality will be implemented');
    } else if (index === 1) {
      // Group Info
      navigation.navigate('GroupInfo', { 
        communityId: communityData.id,
        members: members 
      });
    }
  };
  
  const handleLongPressMessage = (message) => {
    if (message.senderId !== userData.id) return;
    
    setSelectedMessage(message);
    Alert.alert(
      'Message Options',
      'What would you like to do with this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(message.id),
        },
        {
          text: 'Edit',
          onPress: () => editMessage(message),
        },
      ]
    );
  };

  const deleteMessage = async (messageId) => {
    try {
      await firebase.firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('chats')
        .doc(messageId)
        .delete();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const editMessage = (message) => {
    setMessageText(message.text);
    if (message.imageUrl) {
      setSelectedImage({ uri: message.imageUrl });
      setImagePreview(message.imageUrl);
    }
    inputRef.current.focus();
    deleteMessage(message.id);
  };

  const getMessageDateDisplay = (message, index) => {
    if (index === 0) return true;
    if (!message.timestamp || !messages[index - 1].timestamp) return false;
    const currentDate = message.timestamp.toDate().toDateString();
    const prevDate = messages[index - 1].timestamp.toDate().toDateString();
    return currentDate !== prevDate;
  };

  const renderMessageItem = ({ item, index }) => {
    const isCurrentUser = item.senderId === userData.id;
    const sender = members[item.senderId] || { name: 'Unknown User' };
    const showDateHeader = getMessageDateDisplay(item, index);
    const isUnread = item.read && !item.read.includes(userData.id);
    
    return (
      <>
        {showDateHeader && item.timestamp && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {format(item.timestamp.toDate(), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => handleLongPressMessage(item)}
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer,
            isUnread && styles.unreadMessage
          ]}
        >
          {!isCurrentUser && (
            <Image 
              source={sender.profileImageUrl ? { uri: sender.profileImageUrl } : require('../../../../assets/community.png')} 
              style={styles.messageAvatar}
            />
          )}
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
          ]}>
            {!isCurrentUser && (
              <Text style={styles.senderName}>{sender.name || 'Unknown User'}</Text>
            )}
            
            {item.text && (
              <Text style={styles.messageText}>{item.text}</Text>
            )}
            
            {item.imageUrl && (
              <TouchableOpacity onPress={() => openImageViewer(item.imageUrl)}>
                <Image 
                  source={{ uri: item.imageUrl }} 
                  style={styles.messageImage} 
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            
            <View style={styles.messageTimeContainer}>
              <Text style={styles.messageTime}>{item.dateFormatted}</Text>
              {isCurrentUser && (
                <Icon 
                  name={item.read?.length > 1 ? "check-all" : "check"} 
                  size={16} 
                  color={item.read?.length > 1 ? "#4CAF50" : "#888"} 
                  style={styles.readIcon}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </>
    );
  };

  const renderImagePreview = () => {
    if (!imagePreview) return null;
    
    return (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: imagePreview }} style={styles.imagePreview} resizeMode="cover" />
        <TouchableOpacity style={styles.cancelImageButton} onPress={cancelImageUpload}>
          <Icon name="close-circle" size={24} color="#f68422" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#366732" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : keyboardOffset}
      style={styles.keyboardContainer}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={25} color="#fff" />
          </TouchableOpacity>
  
          <TouchableOpacity 
            style={styles.titleContainer}
            onPress={() => navigation.navigate('GroupInfo', { 
              communityId: communityData.id,
              members: members 
            })}
          >
            <Image 
              source={communityData?.images?.[0] ? { uri: communityData.images[0] } : require('../../../../assets/community.png')}
              style={styles.communityImageSmall}
            />
            <View style={styles.titleTextContainer}>
              <Text style={styles.headerTitle}>
                {communityData?.name?.split(' ').slice(0, 2).join(' ')}
              </Text>
              <Text style={styles.memberCount}>
                {Object.keys(members).length} members
              </Text>
            </View>
          </TouchableOpacity>
  
          <TouchableOpacity onPress={showOptionsMenu}>
            <Icon name="dots-vertical" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {/* Messages List */}
        <View style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="chat-outline" size={80} color="#366732" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start a conversation!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessageItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              removeClippedSubviews={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
        
        {/* Image Preview */}
        {renderImagePreview()}
        
        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
            <Icon name="image-plus" size={26} color="#366732" />
          </TouchableOpacity>
          
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={messageText}
            onChangeText={setMessageText}
            multiline
          />
          
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!messageText.trim() && !selectedImage) && styles.disabledSendButton
            ]}
            onPress={handleSendMessage}
            disabled={(!messageText.trim() && !selectedImage) || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      
      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity 
            style={styles.closeViewerButton}
            onPress={() => setImageViewerVisible(false)}
          >
            <Icon name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          {selectedViewImage && (
            <Image 
              source={{ uri: selectedViewImage }} 
              style={styles.fullSizeImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      <ActionSheet
        ref={actionSheetRef}
        title={'Chat Options'}
        options={['Search', 'Group Info', 'Cancel']}
        cancelButtonIndex={3}
        onPress={handleOptionSelect}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 0 : 30
  },
  communityImageSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  titleTextContainer: {
    flexDirection:'column'
  },
  memberCount: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    paddingBottom: 5, 
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: 'rgba(230, 242, 255, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currentUserMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherUserMessageContainer: {
    justifyContent: 'flex-start',
  },
  unreadMessage: {
    opacity: 0.8,
    backgroundColor: 'rgba(54, 103, 50, 0.1)',
    borderRadius: 8,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 15,
    padding: 8,
    paddingBottom: 5,
  },
  currentUserBubble: {
    backgroundColor: '#e8f5e9',
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: '#f2f2f2',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  messageImage: {
    width: width * 0.6,
    height: width * 0.65,
    borderRadius: 4,
    marginVertical: 4,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#888',
  },
  readIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    paddingBottom: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    marginHorizontal: 6,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#366732',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#cccccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#366732',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#366732',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  imagePreviewContainer: {
    padding: 8,
    position: 'relative',
  },
  imagePreview: {
    height: 250,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelImageButton: {
    position: 'absolute',
    top: -6,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullSizeImage: {
    width: '100%',
    height: '80%',
  },
  closeViewerButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
});

export default ChatList;