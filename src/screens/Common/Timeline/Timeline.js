import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  ToastAndroid,
  Platform,
  SafeAreaView,
} from 'react-native';
import { request, check, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { firebase } from '@react-native-firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import ActionSheet from 'react-native-actionsheet';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';


const Timeline = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const actionSheetRef = React.createRef();
  const navigation = useNavigation();
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  console.log("communityData:", communityData.name)

  // Fetch posts from Firebase
  useEffect(() => {
    const unsubscribe = firebase.firestore()
      .collection('communities')
      .doc(communityData?.id)
      .collection('timeline')
      .orderBy('createdAt', 'desc')
      .onSnapshot(snapshot => {
        const postList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAtFormatted: doc.data().createdAt
          ? formatDistanceToNow(doc.data().createdAt.toDate(), { addSuffix: true })
          : 'Just now',
          liked: doc.data().likes && doc.data().likes.includes(userData.id)
        }));
        setPosts(postList);
        setLoading(false);
        setRefreshing(false);
      }, error => {
        console.error('Error fetching posts:', error);
        setLoading(false);
        setRefreshing(false);
      });

    return () => unsubscribe();
  }, [communityData?.id, userData]);

  // Fetch user details for each post
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (posts.length > 0) {
        const updatedPosts = await Promise.all(posts.map(async (post) => {
          try {
            const userDoc = await firebase.firestore()
              .collection('communities')
              .doc(communityData?.id)
              .collection('users')
              .doc(post.postedBy)
              .get();
            
            if (userDoc.exists) {
              return {
                ...post,
                user: userDoc.data()
              };
            }
            return post;
          } catch (error) {
            console.error('Error fetching user details:', error);
            return post;
          }
        }));
        
        setPosts(updatedPosts);
      }
    };
    
    fetchUserDetails();
  }, [posts.length, communityData?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    // The useEffect with the Firestore listener will handle updating the data
  };

  const requestStoragePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          // For Android 13+
          const permissions = [
            PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
            PERMISSIONS.ANDROID.READ_MEDIA_VIDEO,
          ];
          
          // Check permissions first
          const checkResults = await Promise.all(
            permissions.map(permission => check(permission))
          );
          
          // If already granted, return true
          if (checkResults.every(result => result === RESULTS.GRANTED)) {
            return true;
          }
          
          // Request permissions
          const requestResults = await Promise.all(
            permissions.map(permission => request(permission))
          );
          
          return requestResults.every(result => result === RESULTS.GRANTED);
        } else if (Platform.Version >= 29) {
          // For Android 10-12
          const checkResult = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          
          if (checkResult === RESULTS.GRANTED) {
            return true;
          }
          
          const requestResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          return requestResult === RESULTS.GRANTED;
        } else {
          // For older Android versions
          const checkResult = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          
          if (checkResult === RESULTS.GRANTED) {
            return true;
          }
          
          const requestResult = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
          return requestResult === RESULTS.GRANTED;
        }
      }
      return true; // iOS doesn't need this permission for downloads directory
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const handleLikePost = async (postId, isLiked) => {
    try {
      const postRef = firebase.firestore()
        .collection('communities')
        .doc(communityData?.id)
        .collection('timeline')
        .doc(postId);
        
      if (isLiked) {
        // Unlike the post
        await postRef.update({
          likes: firebase.firestore.FieldValue.arrayRemove(userData.id)
        });
      } else {
        // Like the post
        await postRef.update({
          likes: firebase.firestore.FieldValue.arrayUnion(userData.id)
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      ToastAndroid.show('Failed to update like', ToastAndroid.SHORT);
    }
  };

  const handleSharePost = async (post) => {
    try {
      const message = `${post?.content}\n`;
      const imageUrls = post?.attachments || [];
      ToastAndroid.show('Sharing...', ToastAndroid.SHORT)
  
      // Step 1: Download images to cache and collect local file paths
      const localPaths = await Promise.all(
        imageUrls.map(async (url) => {
          const fileName = `shared-${Date.now()}-${Math.random()}.jpg`;
          const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
  
          const downloadResult = await RNFS.downloadFile({
            fromUrl: url,
            toFile: filePath,
          }).promise;
  
          if (downloadResult.statusCode === 200) {
            return Platform.OS === 'android' ? `file://${filePath}` : filePath;
          } else {
            throw new Error(`Failed to download image: ${url}`);
          }
        })
      );
  
      // Step 2: Share using local paths
      const shareOptions = {
        title: 'Share Post',
        message,
        urls: localPaths,
      };
  
      const result = await Share.open(shareOptions);
      console.log('Share result:', result);
  
      // Step 3: Delete temp files after sharing
      await Promise.all(
        localPaths.map(async (filePath) => {
          const cleanedPath = Platform.OS === 'android'
            ? filePath.replace('file://', '')
            : filePath;
          await RNFS.unlink(cleanedPath);
        })
      );
  
      console.log('Temporary files cleaned up');
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Share error:', error);
      }
    }
  };

  const handleDownloadAttachments = async (post) => {
    try {
      // Check permissions first
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        console.log('Storage permission denied');
        ToastAndroid.show('Storage permission denied', ToastAndroid.SHORT);
        return;
      }
      
      // Log the download directory
      const downloadDir = RNFS.DownloadDirectoryPath;
      console.log('Download directory path:', downloadDir);
      
      // Check if directory exists
      const dirExists = await RNFS.exists(downloadDir);
      console.log('Directory exists:', dirExists);
      
      // Create directory if it doesn't exist
      if (!dirExists) {
        try {
          console.log('Attempting to create directory');
          await RNFS.mkdir(downloadDir);
          console.log('Directory created successfully');
        } catch (dirError) {
          console.error('Failed to create directory:', dirError);
          ToastAndroid.show('Cannot create download directory', ToastAndroid.SHORT);
          return;
        }
      }
      
      if (!post?.attachments || post.attachments.length === 0) {
        console.log('No attachments found in post');
        ToastAndroid.show('No attachments to download', ToastAndroid.SHORT);
        return;
      }
      
      console.log('Attachments to download:', post.attachments);
      
      // Process downloads
      for (const url of post.attachments) {
        // Get a safe filename from the URL
        const originalFileName = url.split('/').pop();
        console.log('Original filename:', originalFileName);
        
        // Generate a safe filename
        let fileName = originalFileName;
        if (!fileName || fileName.indexOf('?') !== -1 || fileName === '300') {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000);
          fileName = `file_${timestamp}_${random}.jpg`;
        }
        
        const downloadPath = `${downloadDir}/${fileName}`;
        console.log('Full download path:', downloadPath);
        
        try {
          // Ensure file doesn't already exist
          const fileExists = await RNFS.exists(downloadPath);
          if (fileExists) {
            console.log('File already exists, will be overwritten');
          }
          
          console.log('Starting download from URL:', url);
          
          // Download the file
          const downloadResult = await RNFS.downloadFile({
            fromUrl: url,
            toFile: downloadPath,
            background: true,
            discretionary: true,
            progress: (res) => {
              if (res.contentLength > 0) {
                const progressPercent = (res.bytesWritten / res.contentLength) * 100;
                console.log(`Download progress: ${progressPercent.toFixed(2)}%`);
              }
            }
          }).promise;
          
          console.log('Download result:', downloadResult);
          
          if (downloadResult.statusCode === 200) {
            console.log('File downloaded successfully');
            
            // Verify file exists
            const downloadedFileExists = await RNFS.exists(downloadPath);
            console.log('Downloaded file exists:', downloadedFileExists);
            
            if (downloadedFileExists) {
              // Get file info
              const fileInfo = await RNFS.stat(downloadPath);
              console.log('File info:', fileInfo);
              
              // Notify media scanner
              try {
                await RNFS.scanFile(downloadPath);
                console.log('Media scan complete');
              } catch (scanError) {
                console.error('Media scan failed:', scanError);
              }
              
              ToastAndroid.show('File downloaded successfully', ToastAndroid.SHORT);
            } else {
              console.error('File does not exist after download');
              ToastAndroid.show('Download failed - file not found', ToastAndroid.SHORT);
            }
          } else {
            console.error('Download failed with status code:', downloadResult.statusCode);
            ToastAndroid.show('Download failed', ToastAndroid.SHORT);
          }
        } catch (downloadError) {
          console.error('Download error for URL:', url);
          console.error('Error details:', downloadError);
          ToastAndroid.show('Download failed', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error('General download error:', error);
      ToastAndroid.show('Download failed', ToastAndroid.SHORT);
    }
  };

  const handleSelectImages = () => {
    const options = {
      selectionLimit: 0, // 0 = unlimited
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
      } else {
        const sources = response.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type,
          name: asset.fileName,
        }));
        setSelectedImages(prev => [...prev, ...sources]);
      }
    });
  };

  const removeSelectedImage = (index) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please add some text or images to create a post');
      return;
    }

    setIsUploading(true);
    
    try {
      // Upload images if any
      const attachmentUrls = [];
      
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const cleanName = communityData?.name.replace(/\s+/g, '-').toLowerCase();
          const imageRef = storage().ref(`communities/${communityData?.id}-${cleanName}/timeline/${Date.now()}-${image.name}`);
          await imageRef.putFile(image.uri);
          const url = await imageRef.getDownloadURL();
          attachmentUrls.push(url);
        }
      }

      console.log("iamge uploaded successfully")

      // Create the post
      await firebase.firestore()
        .collection('communities')
        .doc(communityData.id)
        .collection('timeline')
        .add({
          content: newPostText.trim(),
          postedBy: userData.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          likes: [],
          attachments: attachmentUrls,
          user:{apartmentId: userData.apartmentId,
            name:userData.name
          }
        });

      // Reset form
      setNewPostText('');
      setSelectedImages([]);
      setIsUploadModalVisible(false);
      ToastAndroid.show('Post created successfully!', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPostItem = ({ item }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image 
          source={item.user?.profileImageUrl ? { uri: item.user.profileImageUrl } : require('../../../../assets/community.png')} 
          style={styles.userAvatar} 
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.userName}>{item.user?.name || 'Community Member'}</Text>
          <Text style={styles.userApartment}>{item.user?.apartmentId || ''}</Text>
          <Text style={styles.postDate}>{item.createdAtFormatted}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Icon name="dots-vertical" size={22} color="#666" />
        </TouchableOpacity>
      </View>
      
      {item.content && item.content.length > 0 && (
        <View style={styles.contentContainer}>
          <Text style={styles.postContent}>{item.content}</Text>
        </View>
      )}

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.mediaContainer}>
          {item.attachments.length === 1 ? (
            <Image 
              source={{ uri: item.attachments[0] }} 
              style={styles.singleImage} 
              resizeMode="cover" 
            />
          ) : (
            <FlatList
              data={item.attachments}
              keyExtractor={(item, index) => `attachment-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: attachment }) => (
                <Image 
                  source={{ uri: attachment }} 
                  style={styles.galleryImage} 
                  resizeMode="cover" 
                />
              )}
            />
          )}
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLikePost(item.id, item.liked)}
        >
          <Icon name={item.liked ? "heart" : "heart-outline"} size={22} color={item.liked ? "#f68422" : "#666"} />
          <Text style={[styles.actionText, item.liked && styles.likedText]}>
            {item.likes ? item.likes.length : 0} {item.likes && item.likes.length === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleSharePost(item)}
        >
          <Icon name="share-outline" size={22} color="#666" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>

        {item.attachments && item.attachments.length > 0 && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDownloadAttachments(item)}
          >
            <Icon name="download-outline" size={22} color="#666" />
            <Text style={styles.actionText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366732" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  const navigateToChat = () =>{
    navigation.navigate("ChatList")
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Feed</Text>
        <TouchableOpacity
          style={styles.chatButtion}
          onPress={navigateToChat}
        >
          <Icon name="chat-processing" size={25} color="#ffff" />
          <Text style={styles.chatButtonText}>Group</Text>
        </TouchableOpacity>
      </View>
      
      {/* Create Post Button */}
      <TouchableOpacity 
        style={styles.createPostButton}
        onPress={() => setIsUploadModalVisible(true)}
      >
        <View style={styles.createPostContent}>
          {/* <Image 
            source={userData?.profileImageUrl ? { uri: userData.profileImageUrl } : require('../../../assets/icon.png')} 
            style={styles.miniAvatar} 
          /> */}
          <Text style={styles.createPostText}>Share something with the community...</Text>
        </View>
        <Icon name="image-plus" size={24} color="#666" />
      </TouchableOpacity>
      
      {/* Posts List */}
      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="post-outline" size={80} color="#366732" />
          <Text style={styles.emptyText}>No posts available</Text>
          <Text style={styles.emptySubtext}>Be the first to share something!</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.postList}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
      
      {/* Upload Post Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isUploadModalVisible}
        onRequestClose={() => setIsUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity 
                onPress={() => setIsUploadModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              multiline
              value={newPostText}
              onChangeText={setNewPostText}
            />
            
            {selectedImages.length > 0 && (
              <View style={styles.selectedImagesContainer}>
                <FlatList
                  data={selectedImages}
                  horizontal
                  renderItem={({ item, index }) => (
                    <View style={styles.selectedImageContainer}>
                      <Image source={{ uri: item.uri }} style={styles.selectedImage} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => removeSelectedImage(index)}
                      >
                        <Icon name="close-circle" size={24} color="#f68422" />
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(_, index) => `selected-image-${index}`}
                />
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.attachButton}
                onPress={handleSelectImages}
              >
                <Icon name="image-plus" size={24} color="#366732" />
                <Text style={styles.attachButtonText}>Add Images</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.postButton,
                  (isUploading || (!newPostText.trim() && selectedImages.length === 0)) && styles.disabledButton
                ]}
                onPress={handleCreatePost}
                disabled={isUploading || (!newPostText.trim() && selectedImages.length === 0)}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Action Sheet for Share Options */}
      <ActionSheet
        ref={actionSheetRef}
        title={'Share Post'}
        options={['Share via WhatsApp', 'Share via Email', 'Copy Link', 'Cancel']}
        cancelButtonIndex={3}
        onPress={(index) => {
          if (index === 0) {
            // WhatsApp
            ToastAndroid.show('Sharing via WhatsApp...', ToastAndroid.SHORT);
          } else if (index === 1) {
            // Email
            ToastAndroid.show('Sharing via Email...', ToastAndroid.SHORT);
          } else if (index === 2) {
            // Copy link
            ToastAndroid.show('Link copied to clipboard', ToastAndroid.SHORT);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection:'row',
    backgroundColor: '#366732',
    paddingVertical: 15,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    elevation: 3,
    justifyContent:'space-evenly',
    paddingTop:30
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginLeft:70,
    marginTop:5
  },
  createPostButton: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  createPostContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  createPostText: {
    color: '#999',
    fontSize: 16,
  },
  postList: {
    padding: 8,
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  headerTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userApartment: {
    fontSize: 14,
    color: '#666',
  },
  postDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  mediaContainer: {
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: 300,
  },
  galleryImage: {
    width: 220,
    height: 220,
    marginLeft: 12,
    borderRadius: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingVertical: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#f68422',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  postInput: {
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  selectedImagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedImageContainer: {
    marginRight: 10,
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  chatButtion: {
    flexDirection: 'column',
    alignItems: 'center',
    marginLeft:30
  },
  attachButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#366732',
    fontWeight: '500',
  },
  chatButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  postButton: {
    backgroundColor: '#366732',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
});

export default Timeline;