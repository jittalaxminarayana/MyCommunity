import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { firebase } from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

const GroupInfo = ({ route }) => {
  const { communityId, members } = route.params;
  const [communityDetails, setCommunityDetails] = useState(null);
  const [sortedMembers, setSortedMembers] = useState([]);
  const userData = useSelector((state) => state?.user?.userData);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchCommunityDetails = async () => {
      try {
        const doc = await firebase.firestore()
          .collection('communities')
          .doc(communityId)
          .get();
        
        if (doc.exists) {
          setCommunityDetails(doc.data());
        }
      } catch (error) {
        console.error('Error fetching community details:', error);
      }
    };

    fetchCommunityDetails();
  }, [communityId]);

  useEffect(() => {
    if (members) {
      // Sort members by apartmentId (block number)
      const sorted = Object.entries(members)
        .map(([id, member]) => ({ id, ...member }))
        .sort((a, b) => {
          // Extract block numbers (e.g., "B-303" -> "B", "303")
          const aParts = a.apartmentId?.split('-') || [];
          const bParts = b.apartmentId?.split('-') || [];
          
          // Compare block letters first
          if (aParts[0] < bParts[0]) return -1;
          if (aParts[0] > bParts[0]) return 1;
          
          // Then compare numbers
          return parseInt(aParts[1] || 0) - parseInt(bParts[1] || 0);
        });
      
      setSortedMembers(sorted);
    }
  }, [members]);

  const renderMemberItem = ({ item }) => (
    <View style={styles.memberItem}>
      <Image 
        source={item.profileImageUrl ? { uri: item.profileImageUrl } : require('../../../../assets/community.png')} 
        style={styles.memberAvatar}
      />
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberDetails}>
          {item.role} • {item.apartmentId || 'No apartment'}
        </Text>
      </View>
      {item.id === userData.id && (
        <Text style={styles.youText}>You</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Updated Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={25} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Group Info</Text>
        
        {/* Empty View to balance the header */}
        <View style={styles.headerRightPlaceholder} />
      </View>
      
      {communityDetails && (
        <View style={styles.communityInfoContainer}>
          {/* Large Community Image */}
          <Image 
            source={communityDetails.images?.[0] ? { uri: communityDetails.images[0] } : require('../../../../assets/community.png')}
            style={styles.communityImageLarge}
          />
          
          <View style={styles.communityInfo}>
            <Text style={styles.communityName}>{communityDetails.name}</Text>
            <Text style={styles.communityAddress}>{communityDetails.address}</Text>
            <Text style={styles.memberCount}>
              {sortedMembers.length} members • {communityDetails.totalResidents} total residents
            </Text>
          </View>
        </View>
      )}
      
      <FlatList
        data={sortedMembers}
        renderItem={renderMemberItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.membersList}
        ListHeaderComponent={
          <Text style={styles.membersHeader}>Members</Text>
        }
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 35, 
  },
  communityInfoContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  communityImageLarge: {
    width: 90,
    height: 90,
    borderRadius: 60,
  },
  communityInfo: {
    alignItems:'center'
  },
  communityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  communityAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 14,
    color: '#366732',
  },
  membersHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  membersList: {
    paddingBottom: 20,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  youText: {
    fontSize: 12,
    color: '#366732',
    fontWeight: 'bold',
  },
});

export default GroupInfo;