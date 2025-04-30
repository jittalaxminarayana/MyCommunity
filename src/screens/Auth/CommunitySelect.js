import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CommunitySelect = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setLoading(true);
        const communitiesSnapshot = await firestore()
          .collection('communities')
          .orderBy('name', 'asc')
          .get();
        
        const communitiesData = communitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        setCommunities(communitiesData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching communities:', err);
        setError('Failed to load communities. Please try again.');
        setLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const handleSelectCommunity = (community) => {
    navigation.navigate('Login', { 
      community: community,
    });
  };

  const renderCommunityCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.communityCard}
        onPress={() => handleSelectCommunity(item)}
        activeOpacity={0.7}
      >
        <View style={styles.logoContainer}>
          <Icon name="home-city" size={40} color="#366732" />
        </View>
        <View style={styles.communityDetails}>
          <Text style={styles.communityName}>{item.name}</Text>
          <Text style={styles.communityAddress}>{item.address}</Text>
          <View style={styles.contactRow}>
            <Icon name="phone" size={14} color="#666" />
            <Text style={styles.contactNumber}>{item.contactNumber}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color="#f68422" style={styles.arrowIcon} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#366732" />
        <Text style={styles.loadingText}>Loading Communities...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#f68422" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            setCommunities([]);
            // Re-run the effect
            setLoading(true);
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#366732" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>MyCommUnity</Text>
        <Text style={styles.subtitle}>Select your community to continue</Text>
      </View>
      
      {communities.length === 0 ? (
        <View style={styles.noCommunities}>
          <Icon name="home-remove" size={60} color="#666" />
          <Text style={styles.noCommunityText}>No communities available</Text>
        </View>
      ) : (
        <FlatList
          data={communities}
          renderItem={renderCommunityCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
        />
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't see your community?</Text>
        <TouchableOpacity>
          <Text style={styles.contactAdmin}>Contact Administrator</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#366732',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#e6f2ff',
    marginBottom: 10,
  },
  listContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  communityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  communityDetails: {
    flex: 1,
  },
  communityName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#366732',
    marginBottom: 3,
  },
  communityAddress: {
    fontSize: 14,
    color: '#444',
    marginBottom: 5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactNumber: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  arrowIcon: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#366732',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 20,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f68422',
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noCommunities: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noCommunityText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#cce0ff',
  },
  footerText: {
    fontSize: 14,
    color: '#444',
  },
  contactAdmin: {
    fontSize: 14,
    color: '#f68422',
    fontWeight: 'bold',
    marginTop: 5,
  },
});

export default CommunitySelect;