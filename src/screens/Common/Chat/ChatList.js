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
  Dimensions
} from 'react-native';
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
  
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (Platform.OS === 'android') setKeyboardOffset(0); // Adjust offset when keyboard is open
    });

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      if (Platform.OS === 'android') setKeyboardOffset(-50); // Reset offset when keyboard is closed
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

  // Fetch messages from Firebase
  useEffect(() => {
    if (!communityData?.id) return;

    const unsubscribe = firebase.firestore()
      .collection('communities')
      .doc(communityData.id)
      .collection('chats')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        const messageList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateFormatted: doc.data().timestamp ? format(doc.data().timestamp.toDate(), 'h:mm a') : ''
        }));
        setMessages(messageList.reverse());
        setLoading(false);
      }, error => {
        console.error('Error fetching messages:', error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [communityData?.id]);

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
          read: [userData.id]
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
    
    return (
      <>
        {showDateHeader && item.timestamp && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>
              {format(item.timestamp.toDate(), 'MMMM d, yyyy')}
            </Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
        ]}>
          {!isCurrentUser && (
            <Image 
              source={sender.profileImageUrl ? { uri: sender.profileImageUrl } : null} 
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
            
            <Text style={styles.messageTime}>{item.dateFormatted}</Text>
          </View>
        </View>
      </>
    );
  };

  const renderImagePreview = () => {
    if (!imagePreview) return null;
    
    return (
      <View style={styles.imagePreviewContainer}>
        <Image source={{ uri: imagePreview }} style={styles.imagePreview} resizeMode="cover" />
        <TouchableOpacity style={styles.cancelImageButton} onPress={cancelImageUpload}>
          <Icon name="close-circle" size={22} color="#f68422" />
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
  
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Community Chat</Text>
          </View>
  
          <View style={styles.onlineIndicator}>
            <Text style={styles.memberCountText}>
              {Object.keys(members).length} Members
            </Text>
          </View>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  onlineIndicator: {
    padding: 5,
  },
  memberCountText: {
    color: '#fff',
    fontSize: 14,
  },
  backButton: {
    padding: 5,
  },
  keyboardAvoidingContainer: {
    flex: 1,
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
  messageTime: {
    fontSize: 12,
    color: '#888',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    // borderTopWidth: 1,
    // borderTopColor: '#e0e0e0',
    paddingBottom:15
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
    marginHorizontal: 8,
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
    backgroundColor: '#f0f0f0',
    padding: 8,
    position: 'relative',
  },
  imagePreview: {
    height: 100,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelImageButton: {
    position: 'absolute',
    top: 0,
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