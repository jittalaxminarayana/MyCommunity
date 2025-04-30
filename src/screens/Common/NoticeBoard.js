import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';

const NoticeBoard = ({navigation}) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const userData = useSelector((state) => state?.user?.userData);
  const communityData = useSelector((state) => state?.user?.communityData);
  console.log("communityData:", communityData.id)

  useEffect(() => {
    const unsubscribe = firebase.firestore()
    .collection('communities')
    .doc(communityData.id)
    .collection('notices')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const noticeList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAtFormatted: data.createdAt
            ? formatDistanceToNow(data.createdAt.toDate(), { addSuffix: true })
            : 'Unknown'
        };
      });
      console.log("Ordered notices:", noticeList);
      setNotices(noticeList);
      setLoading(false);
    }, error => {
      console.error('Firestore error:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [communityData.id]);

  const filterNotices = () => {
    if (selectedCategory === 'all') {
      return notices;
    }
    return notices.filter(notice => notice.category === selectedCategory);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'event':
        return 'calendar-month';
      case 'announcement':
        return 'bullhorn';
      case 'emergency':
        return 'alert-circle';
      default:
        return 'note-text';
    }
  };

  const renderCategoryFilter = () => {
    const categories = [
      { id: 'all', label: 'All' },
      { id: 'event', label: 'Events' },
      { id: 'announcement', label: 'Announcements' },
      { id: 'emergency', label: 'Emergency' }
    ];

    return (
      <View style={styles.categoryContainer}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text 
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.selectedCategoryText
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderNoticeItem = ({ item }) => (
    <View style={styles.noticeCard}>
      <View style={styles.noticeHeader}>
        <View style={styles.categoryIconContainer}>
          <Icon name={getCategoryIcon(item.category)} size={24} color="#f68422" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.noticeTitle}>{item.title}</Text>
          <Text style={styles.noticeDate}>{item.createdAtFormatted}</Text>
        </View>
        <View style={[styles.categoryTag, getCategoryStyle(item.category)]}>
          <Text style={styles.categoryTagText}>{item.category}</Text>
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.noticeContent}>{item.content}</Text>
      </View>

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsContainer}>
          {/* <Text style={styles.attachmentsTitle}>Attachments:</Text> */}
          <FlatList
            horizontal
            data={item.attachments}
            keyExtractor={(item, index) => `attachment-${index}`}
            renderItem={({ item: attachment }) => (
              <View>
                <Image
                  source={attachment ? { uri: attachment } : require('../../../assets/community.png')}
                  style={styles.userAvatar}
                />
              </View>
            )}
          />
        </View>
      )}
    </View>
  );

  const getCategoryStyle = (category) => {
    switch (category) {
      case 'event':
        return styles.eventCategory;
      case 'announcement':
        return styles.announcementCategory;
      case 'emergency':
        return styles.emergencyCategory;
      default:
        return {};
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366732" />
        <Text style={styles.loadingText}>Loading notices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Notices</Text>
      </View>
      
      {renderCategoryFilter()}
      
      {notices.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="clipboard-text-outline" size={80} color="#366732" />
          <Text style={styles.emptyText}>No notices available</Text>
        </View>
      ) : (
        <FlatList
          data={filterNotices()}
          renderItem={renderNoticeItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.noticeList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    backgroundColor: '#366732',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 10,
    justifyContent: 'space-between',
    elevation: 2,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategory: {
    backgroundColor: '#366732',
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noticeList: {
    padding: 10,
    paddingBottom: 20,
  },
  noticeCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  noticeHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  noticeDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    padding: 16,
  },
  noticeContent: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  attachmentsContainer: {
    padding: 8,
    borderTopColor: '#f0f0f0',
  },
  attachmentsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  attachmentText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#366732',
  },
  eventCategory: {
    backgroundColor: '#366732',
  },
  announcementCategory: {
    backgroundColor: '#f68422',
  },
  emergencyCategory: {
    backgroundColor: '#e74c3c',
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
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  userAvatar: {
    width: 220,
    height: 220,
    borderRadius: 8,
  },
});

export default NoticeBoard;